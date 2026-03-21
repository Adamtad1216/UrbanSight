import { IssueReport } from "../models/IssueReport.js";
import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import { User } from "../models/User.js";
import {
  terminalIssueStatuses,
  terminalRequestStatuses,
} from "../utils/constants.js";
import { getSystemSettings } from "./systemSettingService.js";

async function getActiveStaffByRole(role, branch) {
  const query = { role, status: "active", isActive: true };
  if (branch) {
    query.branch = branch;
  }

  return User.find(query).select("_id").lean();
}

async function calculateUserWorkload(userId) {
  const [connectionCount, issueCount] = await Promise.all([
    NewConnectionRequest.countDocuments({
      status: { $nin: terminalRequestStatuses },
      $or: [{ assignedSurveyor: userId }, { assignedTechnicians: userId }],
    }),
    IssueReport.countDocuments({
      status: { $nin: terminalIssueStatuses },
      assignedTechnician: userId,
    }),
  ]);

  return connectionCount + issueCount;
}

export async function getLeastLoadedUser(role, options = {}) {
  const { branch, excludeUserIds = [], bypassAutoAssign = false } = options;
  const settings = await getSystemSettings();

  if (!settings.autoAssignTasks && !bypassAutoAssign) {
    return null;
  }

  const users = await getActiveStaffByRole(role, branch);
  if (!users.length) {
    return null;
  }

  const excludeSet = new Set(excludeUserIds.map((id) => String(id)));
  const candidates = users.filter((user) => !excludeSet.has(String(user._id)));

  if (!candidates.length) {
    return null;
  }

  const workloads = await Promise.all(
    candidates.map(async (user) => ({
      userId: user._id,
      load: await calculateUserWorkload(user._id),
    })),
  );

  workloads.sort((a, b) => a.load - b.load);
  return workloads[0]?.userId || null;
}

export async function getLeastLoadedUsers(role, count, options = {}) {
  const { branch, bypassAutoAssign = false } = options;
  const settings = await getSystemSettings();

  if (!settings.autoAssignTasks && !bypassAutoAssign) {
    return [];
  }

  const users = await getActiveStaffByRole(role, branch);
  if (!users.length) {
    return [];
  }

  const workloads = await Promise.all(
    users.map(async (user) => ({
      userId: user._id,
      load: await calculateUserWorkload(user._id),
    })),
  );

  workloads.sort((a, b) => a.load - b.load);
  return workloads.slice(0, count).map((entry) => entry.userId);
}
