import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import { IssueReport } from "../models/IssueReport.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { sendOk } from "../utils/response.js";
import { getLastMonthKeys, monthKey, monthLabel } from "../utils/timeSeries.js";

function isGlobalDashboardRole(role) {
  return role === roles.ADMIN || role === roles.DIRECTOR;
}

function getBranchScopeFilter(user) {
  if (
    !user?.branch ||
    isGlobalDashboardRole(user.role) ||
    user.role === roles.CITIZEN
  ) {
    return null;
  }

  return { branch: user.branch };
}

function withBranchScope(query, branchFilter) {
  return branchFilter ? { ...query, ...branchFilter } : query;
}

async function getRevenueCollected(user) {
  const branchFilter = getBranchScopeFilter(user);
  const branchScopedRevenueAllowed =
    isGlobalDashboardRole(user.role) || user.role !== roles.CITIZEN;

  if (!branchScopedRevenueAllowed) {
    return 0;
  }

  const [requestRevenue, issueRevenue] = await Promise.all([
    NewConnectionRequest.aggregate([
      {
        $match: withBranchScope({ "payment.status": "verified" }, branchFilter),
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$totalEstimatedCost", 0] } },
        },
      },
    ]),
    IssueReport.aggregate([
      {
        $match: withBranchScope({ "payment.status": "verified" }, branchFilter),
      },
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
  const branchFilter = getBranchScopeFilter(user);

  if (user.role === roles.DIRECTOR) {
    return NewConnectionRequest.countDocuments({ status: "submitted" });
  }

  if (user.role === roles.COORDINATOR) {
    return NewConnectionRequest.countDocuments({
      ...branchFilter,
      status: { $in: ["under_review", "inspection", "approved"] },
    });
  }

  if (user.role === roles.SURVEYOR) {
    return NewConnectionRequest.countDocuments({
      assignedSurveyor: user._id,
      ...branchFilter,
      status: { $in: ["under_review", "inspection"] },
    });
  }

  if (user.role === roles.TECHNICIAN) {
    const [requestTasks, issueTasks] = await Promise.all([
      NewConnectionRequest.countDocuments({
        assignedTechnicians: user._id,
        ...branchFilter,
        status: "approved",
      }),
      IssueReport.countDocuments({
        assignedTechnician: user._id,
        ...branchFilter,
        status: { $in: ["approved", "payment_verified", "waiting_payment"] },
      }),
    ]);

    return requestTasks + issueTasks;
  }

  if (user.role === roles.FINANCE) {
    return NewConnectionRequest.countDocuments({
      ...branchFilter,
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
    ...branchFilter,
    status: { $nin: ["completed", "rejected"] },
  });
}

async function getRoleCompletedTasksCount(user) {
  const branchFilter = getBranchScopeFilter(user);

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
      ...branchFilter,
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
        ...branchFilter,
        "implementationCompletion.technicianCompletions.technician": user._id,
      }),
      IssueReport.countDocuments({
        assignedTechnician: user._id,
        ...branchFilter,
        status: "completed",
      }),
    ]);

    return requestDone + issueDone;
  }

  if (user.role === roles.FINANCE) {
    const [requestVerified, issueVerified] = await Promise.all([
      NewConnectionRequest.countDocuments({
        assignedFinanceOfficer: user._id,
        ...branchFilter,
        "payment.status": "verified",
      }),
      IssueReport.countDocuments({
        assignedFinanceOfficer: user._id,
        ...branchFilter,
        "payment.status": "verified",
      }),
    ]);

    return requestVerified + issueVerified;
  }

  const scope = branchFilter || {};
  const [requestCompleted, issueCompleted] = await Promise.all([
    NewConnectionRequest.countDocuments({ ...scope, status: "completed" }),
    IssueReport.countDocuments({ ...scope, status: "completed" }),
  ]);

  return requestCompleted + issueCompleted;
}

async function getTotalRequestsCount(user) {
  const branchFilter = getBranchScopeFilter(user);
  const scope = branchFilter || {};

  if (user.role === roles.CITIZEN) {
    const [requestCount, issueCount] = await Promise.all([
      NewConnectionRequest.countDocuments({ citizen: user._id }),
      IssueReport.countDocuments({ citizen: user._id }),
    ]);

    return requestCount + issueCount;
  }

  const [requestCount, issueCount] = await Promise.all([
    NewConnectionRequest.countDocuments(scope),
    IssueReport.countDocuments(scope),
  ]);

  return requestCount + issueCount;
}

export async function getDashboardStats(req, res) {
  const user = req.user;
  const branchFilter = getBranchScopeFilter(user);
  const branchScopedStats =
    !isGlobalDashboardRole(user.role) && user.role !== roles.CITIZEN;

  const [
    totalRequests,
    pendingTasks,
    completedTasks,
    revenueCollected,
    activeStaff,
  ] = await Promise.all([
    getTotalRequestsCount(user),
    getRolePendingTasksCount(user),
    getRoleCompletedTasksCount(user),
    getRevenueCollected(user),
    isGlobalDashboardRole(user.role)
      ? User.countDocuments({ role: { $ne: roles.CITIZEN }, status: "active" })
      : User.countDocuments({
          role: { $ne: roles.CITIZEN },
          status: "active",
          ...(branchScopedStats && branchFilter ? branchFilter : {}),
        }),
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
  const user = _req.user;
  const branchFilter = getBranchScopeFilter(user);
  const scope = isGlobalDashboardRole(user.role) ? {} : branchFilter || {};
  const [requests, issues] = await Promise.all([
    NewConnectionRequest.find(scope)
      .select("createdAt status totalEstimatedCost payment")
      .lean(),
    IssueReport.find(scope)
      .select("createdAt status totalEstimatedCost payment")
      .lean(),
  ]);

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

  for (const issue of issues) {
    if (issue.payment?.status !== "verified") {
      continue;
    }

    const paymentKey = monthKey(issue.payment.verifiedAt || issue.createdAt);
    if (revenueTrendMap[paymentKey] !== undefined) {
      revenueTrendMap[paymentKey] += Number(issue.totalEstimatedCost || 0);
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
