import { EventEmitter } from "events";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { sendNotificationEmail } from "../utils/email.js";

function buildNotificationSubject(context = {}) {
  if (context.service === "account" || context.event === "account_created") {
    return "UrbanSight Account Created";
  }

  if (context.service === "new_connection") {
    return "UrbanSight New Connection Update";
  }

  if (context.service === "issue_reporting") {
    return "UrbanSight Issue Report Update";
  }

  return "UrbanSight Notification";
}

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.buffer = [];
  }

  async notify({
    recipientId,
    message,
    context = {},
    channels = {},
    emailMessage,
  }) {
    const shouldPush = channels.push !== false;
    const shouldEmail = channels.email !== false;

    const payload = {
      recipientId,
      message,
      context,
      channels: {
        push: shouldPush,
        email: shouldEmail,
      },
      createdAt: new Date(),
    };

    if (shouldPush) {
      this.buffer.push(payload);
      this.emit("notification", payload);
    }

    if (shouldPush) {
      try {
        await Notification.create({
          userId: recipientId,
          message,
          requestId: context.requestId || null,
          issueId: context.issueId || null,
          read: false,
        });
      } catch (_error) {
        // Keep API actions non-blocking if notification persistence fails.
      }
    }

    // Email delivery is non-critical for the request lifecycle; run it in background.
    if (shouldEmail) {
      setImmediate(async () => {
        try {
          const recipient = await User.findById(recipientId)
            .select("name email status isActive")
            .lean();

          if (
            recipient?.email &&
            recipient.status === "active" &&
            recipient.isActive
          ) {
            await sendNotificationEmail({
              name: recipient.name,
              email: recipient.email,
              subject: buildNotificationSubject(context),
              message: emailMessage || message,
              wrapMessage: !emailMessage,
            });
          }
        } catch (_error) {
          // Keep API actions non-blocking if email delivery fails.
        }
      });
    }

    return payload;
  }

  clearBuffer() {
    this.buffer = [];
  }

  getBuffer() {
    return [...this.buffer];
  }
}

export const notificationService = new NotificationService();
