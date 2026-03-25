import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import { IssueReport } from "../models/IssueReport.js";
import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { getLastMonthKeys, monthKey, monthLabel } from "../utils/timeSeries.js";

export async function buildLandingMetrics() {
  const [
    totalRequests,
    totalIssues,
    completedRequests,
    completedIssues,
    pendingRequests,
    pendingIssues,
    activeCitizens,
    activeStaff,
    verifiedRequestPayments,
    verifiedIssuePayments,
    requestBranches,
    issueBranches,
    requestDocs,
    issueDocs,
  ] = await Promise.all([
    NewConnectionRequest.countDocuments(),
    IssueReport.countDocuments(),
    NewConnectionRequest.countDocuments({ status: "completed" }),
    IssueReport.countDocuments({ status: "completed" }),
    NewConnectionRequest.countDocuments({
      status: { $nin: ["completed", "rejected"] },
    }),
    IssueReport.countDocuments({ status: { $nin: ["completed", "rejected"] } }),
    User.countDocuments({ role: roles.CITIZEN, status: "active" }),
    User.countDocuments({ role: { $ne: roles.CITIZEN }, status: "active" }),
    NewConnectionRequest.countDocuments({ "payment.status": "verified" }),
    IssueReport.countDocuments({ "payment.status": "verified" }),
    NewConnectionRequest.distinct("branch"),
    IssueReport.distinct("branch"),
    NewConnectionRequest.find({}).select("createdAt").lean(),
    IssueReport.find({}).select("createdAt").lean(),
  ]);

  const monthlyKeys = getLastMonthKeys(6);
  const monthlyIntakeMap = Object.fromEntries(
    monthlyKeys.map((key) => [key, 0]),
  );

  for (const item of requestDocs) {
    const key = monthKey(item.createdAt);
    if (monthlyIntakeMap[key] !== undefined) {
      monthlyIntakeMap[key] += 1;
    }
  }

  for (const item of issueDocs) {
    const key = monthKey(item.createdAt);
    if (monthlyIntakeMap[key] !== undefined) {
      monthlyIntakeMap[key] += 1;
    }
  }

  const branchesCovered = new Set([...requestBranches, ...issueBranches]).size;
  const monthlyIntake = monthlyKeys.map((key) => ({
    month: monthLabel(key),
    value: monthlyIntakeMap[key],
  }));

  return {
    metrics: {
      totalRequests,
      totalIssues,
      completedServices: completedRequests + completedIssues,
      pendingServices: pendingRequests + pendingIssues,
      activeCitizens,
      activeStaff,
      verifiedTransactions: verifiedRequestPayments + verifiedIssuePayments,
      branchesCovered,
    },
    trends: {
      monthlyIntake,
      serviceMix: [
        { label: "New Connections", value: totalRequests },
        { label: "Issue Reports", value: totalIssues },
      ],
    },
  };
}
