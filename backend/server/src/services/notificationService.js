import { EventEmitter } from "events";
import { Notification } from "../models/Notification.js";

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.buffer = [];
  }

  async notify({ recipientId, message, context = {} }) {
    const payload = {
      recipientId,
      message,
      context,
      createdAt: new Date(),
    };

    this.buffer.push(payload);
    this.emit("notification", payload);

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
