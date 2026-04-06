import { Configuration } from "../models/Configuration.js";
import {
  DEFAULT_CONFIGURATION,
  mergeConfiguration,
} from "../config/defaultConfiguration.js";
import { notificationService } from "./notificationService.js";

const CONFIG_KEY = "global";

function formatMessage(template, values = {}) {
  return String(template || "").replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_, key) => {
      const value = values[key];
      return value === undefined || value === null ? "" : String(value);
    },
  );
}

function toStatusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .join(" ");
}

export async function notifyCitizenRequestWorkflowStep({
  requestDoc,
  status,
  reason = "",
}) {
  if (!requestDoc?.citizen || !status) {
    return null;
  }

  const rawConfig = await Configuration.findOne({ key: CONFIG_KEY })
    .select("notifications")
    .lean();

  const config = mergeConfiguration(DEFAULT_CONFIGURATION, rawConfig || {});
  const notificationConfig = config.notifications || {};

  if (!notificationConfig.notifyCitizenOnStatusChange) {
    return null;
  }

  const template =
    notificationConfig.workflowStepTemplates?.new_connection?.[status] || {};

  const values = {
    customerName: requestDoc.customerName || "Customer",
    status,
    statusLabel: toStatusLabel(status),
    reason: reason || requestDoc.adjustment?.reason || "",
    requestId: String(requestDoc._id || ""),
    waterConnectionCode: requestDoc.waterConnectionCode || "-",
    customerCode: requestDoc.customerCode || "-",
  };

  const pushMessage = formatMessage(template.push, values).trim();
  const emailMessage = formatMessage(template.email, values).trim();

  return notificationService.notify({
    recipientId: requestDoc.citizen,
    message:
      pushMessage || emailMessage || "Your application status has changed.",
    emailMessage:
      emailMessage ||
      pushMessage ||
      "Your application has a new workflow update.",
    context: {
      requestId: requestDoc._id,
      service: "new_connection",
      workflowStep: status,
    },
    channels: {
      push: notificationConfig.enablePush !== false,
      email: notificationConfig.enableEmail !== false,
    },
  });
}
