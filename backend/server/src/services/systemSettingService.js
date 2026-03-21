import { SystemSetting } from "../models/SystemSetting.js";

let cache = null;
let cacheExpiresAt = 0;

function normalizeSetting(doc) {
  return {
    maintenanceMode: Boolean(doc?.maintenanceMode),
    autoAssignTasks:
      doc?.autoAssignTasks === undefined ? true : Boolean(doc.autoAssignTasks),
  };
}

export async function getSystemSettings({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cache && now < cacheExpiresAt) {
    return cache;
  }

  const doc = await SystemSetting.findOne().lean();

  if (!doc) {
    cache = { maintenanceMode: false, autoAssignTasks: true };
    cacheExpiresAt = now + 10000;
    return cache;
  }

  cache = normalizeSetting(doc);
  cacheExpiresAt = now + 10000;
  return cache;
}

export async function updateSystemSettings(nextValues, updatedBy = null) {
  const current = await SystemSetting.findOne();
  const doc = current || new SystemSetting();

  if (typeof nextValues.maintenanceMode === "boolean") {
    doc.maintenanceMode = nextValues.maintenanceMode;
  }

  if (typeof nextValues.autoAssignTasks === "boolean") {
    doc.autoAssignTasks = nextValues.autoAssignTasks;
  }

  if (updatedBy) {
    doc.updatedBy = updatedBy;
  }

  await doc.save();

  cache = normalizeSetting(doc);
  cacheExpiresAt = Date.now() + 10000;

  return cache;
}
