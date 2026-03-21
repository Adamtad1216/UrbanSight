import { Notification } from "../models/Notification.js";
import { sendError, sendOk } from "../utils/response.js";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function listMyNotifications(req, res) {
  const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
  const unreadOnly = String(req.query.unread || "").toLowerCase() === "true";

  const query = { userId: req.user._id };
  if (unreadOnly) {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return sendOk(res, { notifications });
}

export async function getNotificationSummary(req, res) {
  const [unreadCount, recent] = await Promise.all([
    Notification.countDocuments({
      userId: req.user._id,
      read: false,
    }),
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
  ]);

  return sendOk(res, {
    unreadCount,
    notifications: recent,
  });
}

export async function markNotificationAsRead(req, res) {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return sendError(res, 404, "Notification not found");
  }

  if (!notification.read) {
    notification.read = true;
    await notification.save();
  }

  return sendOk(res, { notification });
}

export async function markAllNotificationsAsRead(req, res) {
  const result = await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true } },
  );

  return sendOk(res, {
    updatedCount: result.modifiedCount || 0,
  });
}
