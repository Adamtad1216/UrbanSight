import { Configuration } from "../models/Configuration.js";
import {
  DEFAULT_CONFIGURATION,
  mergeConfiguration,
} from "../config/defaultConfiguration.js";
import { notificationService } from "./notificationService.js";

const CONFIG_KEY = "global";

function formatTemplate(template, values = {}) {
  return String(template || "").replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_, key) => {
      const value = values[key];
      return value == null ? "" : String(value);
    },
  );
}

function roleLabel(role) {
  return String(role || "user").replace(/_/g, " ");
}

export async function notifyAccountCreated({ user }) {
  if (!user?._id) {
    return null;
  }

  const rawConfig = await Configuration.findOne({ key: CONFIG_KEY })
    .select("notifications")
    .lean();

  const config = mergeConfiguration(DEFAULT_CONFIGURATION, rawConfig || {});
  const notificationConfig = config.notifications || {};
  const template = notificationConfig.accountCreationTemplate || {};

  const values = {
    name: user.name || "User",
    role: roleLabel(user.role),
    email: user.email || "",
  };

  const pushMessage = formatTemplate(template.push, values).trim();
  const emailMessage = formatTemplate(template.email, values).trim();

  return notificationService.notify({
    recipientId: user._id,
    message:
      pushMessage || "Your UrbanSight account has been created successfully.",
    emailMessage:
      emailMessage || "Your UrbanSight account has been created successfully.",
    context: {
      service: "account",
      event: "account_created",
      userId: user._id,
    },
    channels: {
      push: notificationConfig.enablePush !== false,
      email: notificationConfig.enableEmail !== false,
    },
  });
}
