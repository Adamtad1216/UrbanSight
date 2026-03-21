import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, required: true, trim: true },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewConnectionRequest",
      default: null,
      index: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IssueReport",
      default: null,
      index: true,
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Notification = mongoose.model("Notification", notificationSchema);
