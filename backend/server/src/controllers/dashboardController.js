import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import { IssueReport } from "../models/IssueReport.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { sendOk } from "../utils/response.js";
import { getLastMonthKeys, monthKey, monthLabel } from "../utils/timeSeries.js";

async function getRevenueCollected() {
  const [requestRevenue, issueRevenue] = await Promise.all([
    NewConnectionRequest.aggregate([
      { $match: { "payment.status": "verified" } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$totalEstimatedCost", 0] } },
        },
      },
    ]),
    IssueReport.aggregate([
      { $match: { "payment.status": "verified" } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$totalEstimatedCost", 0] } },
        },
      },
    ]),
  ]);

  return (
    Number(requestRevenue[0]?.total || 0) + Number(issueRevenue[0]?.total || 0)
  );
}

async function getRolePendingTasksCount(user) {
  if (user.role === roles.DIRECTOR) {
    return NewConnectionRequest.countDocuments({ status: "submitted" });
  }

  if (user.role === roles.COORDINATOR) {
    return NewConnectionRequest.countDocuments({
      branch: user.branch,
      status: { $in: ["under_review", "inspection", "approved"] },
    });
  }

  if (user.role === roles.SURVEYOR) {
    return NewConnectionRequest.countDocuments({
      assignedSurveyor: user._id,
      status: { $in: ["under_review", "inspection"] },
    });
  }

  if (user.role === roles.TECHNICIAN) {
    const [requestTasks, issueTasks] = await Promise.all([
      NewConnectionRequest.countDocuments({
        assignedTechnicians: user._id,
        status: "approved",
      }),
      IssueReport.countDocuments({
        assignedTechnician: user._id,
        status: { $in: ["approved", "payment_verified", "waiting_payment"] },
      }),
    ]);

    return requestTasks + issueTasks;
  }

  if (user.role === roles.FINANCE) {
    return NewConnectionRequest.countDocuments({
      status: "payment_submitted",
      $or: [
        { assignedFinanceOfficer: user._id },
        { assignedFinanceOfficer: null },
      ],
    });
  }

  if (user.role === roles.CITIZEN) {
    const [requestPending, issuePending] = await Promise.all([
      NewConnectionRequest.countDocuments({
        citizen: user._id,
        status: { $nin: ["completed", "rejected"] },
      }),
      IssueReport.countDocuments({
        citizen: user._id,
        status: { $nin: ["completed", "rejected"] },
      }),
    ]);

    return requestPending + issuePending;
  }

  return NewConnectionRequest.countDocuments({
    status: { $nin: ["completed", "rejected"] },
  });
}

async function getRoleCompletedTasksCount(user) {
  if (user.role === roles.CITIZEN) {
    const [requestCompleted, issueCompleted] = await Promise.all([
      NewConnectionRequest.countDocuments({
        citizen: user._id,
        status: "completed",
      }),
      IssueReport.countDocuments({ citizen: user._id, status: "completed" }),
    ]);

    return requestCompleted + issueCompleted;
  }

  if (user.role === roles.SURVEYOR) {
    return NewConnectionRequest.countDocuments({
      assignedSurveyor: user._id,
      status: {
        $in: [
          "waiting_payment",
          "payment_submitted",
          "payment_verified",
          "approved",
          "completed",
        ],
      },
    });
  }

  if (user.role === roles.TECHNICIAN) {
    const [requestDone, issueDone] = await Promise.all([
      NewConnectionRequest.countDocuments({
        assignedTechnicians: user._id,
        "implementationCompletion.technicianCompletions.technician": user._id,
      }),
      IssueReport.countDocuments({
        assignedTechnician: user._id,
        status: "completed",
      }),
    ]);

    return requestDone + issueDone;
  }

  if (user.role === roles.FINANCE) {
    const [requestVerified, issueVerified] = await Promise.all([
      NewConnectionRequest.countDocuments({
        assignedFinanceOfficer: user._id,
        "payment.status": "verified",
      }),
      IssueReport.countDocuments({
        assignedFinanceOfficer: user._id,
        "payment.status": "verified",
      }),
    ]);

    return requestVerified + issueVerified;
  }

  return NewConnectionRequest.countDocuments({ status: "completed" });
}

export async function getDashboardStats(req, res) {
  const user = req.user;

  const [
    totalRequests,
    pendingTasks,
    completedTasks,
    revenueCollected,
    activeStaff,
  ] = await Promise.all([
    user.role === roles.CITIZEN
      ? NewConnectionRequest.countDocuments({ citizen: user._id })
      : NewConnectionRequest.countDocuments(),
    getRolePendingTasksCount(user),
    getRoleCompletedTasksCount(user),
    getRevenueCollected(),
    User.countDocuments({ role: { $ne: roles.CITIZEN }, status: "active" }),
  ]);

  return sendOk(res, {
    stats: {
      totalRequests,
      pendingTasks,
      completedTasks,
      revenueCollected,
      activeStaff,
    },
  });
}

export async function getDashboardActivity(req, res) {
  const user = req.user;

  const notifications = await Notification.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const activity = notifications.map((item) => ({
    id: String(item._id),
    message: item.message,
    createdAt: item.createdAt,
    read: item.read,
    type: item.issueId ? "issue" : "request",
  }));

  return sendOk(res, { activity });
}

export async function getDashboardCharts(_req, res) {
  const requests = await NewConnectionRequest.find({})
    .select("createdAt status totalEstimatedCost payment")
    .lean();

  const lastSix = getLastMonthKeys(6);

  const requestsOverTimeMap = Object.fromEntries(
    lastSix.map((key) => [key, { requests: 0, completed: 0 }]),
  );

  const revenueTrendMap = Object.fromEntries(lastSix.map((key) => [key, 0]));

  const statusDistributionMap = {};

  for (const request of requests) {
    const key = monthKey(request.createdAt);
    if (requestsOverTimeMap[key]) {
      requestsOverTimeMap[key].requests += 1;
      if (request.status === "completed") {
        requestsOverTimeMap[key].completed += 1;
      }
    }

    statusDistributionMap[request.status] =
      (statusDistributionMap[request.status] || 0) + 1;

    if (request.payment?.status === "verified") {
      const paymentKey = monthKey(
        request.payment.verifiedAt || request.createdAt,
      );
      if (revenueTrendMap[paymentKey] !== undefined) {
        revenueTrendMap[paymentKey] += Number(request.totalEstimatedCost || 0);
      }
    }
  }

  const requestsOverTime = lastSix.map((key) => ({
    month: monthLabel(key),
    requests: requestsOverTimeMap[key].requests,
    completed: requestsOverTimeMap[key].completed,
  }));

  const statusDistribution = Object.entries(statusDistributionMap).map(
    ([name, value]) => ({ name, value }),
  );

  const revenueTrend = lastSix.map((key) => ({
    month: monthLabel(key),
    revenue: revenueTrendMap[key],
  }));

  return sendOk(res, {
    charts: {
      requestsOverTime,
      statusDistribution,
      revenueTrend,
    },
  });
}
