import mongoose from "mongoose";
import { branches, issueStatuses } from "../utils/constants.js";

const issueWorkflowLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    fromStatus: { type: String, enum: issueStatuses },
    toStatus: { type: String, enum: issueStatuses, required: true },
    note: { type: String, default: "", trim: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, default: "system" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const issuePaymentInfoSchema = new mongoose.Schema(
  {
    transactionId: { type: String, trim: true, default: "" },
    method: { type: String, trim: true, default: "" },
    receiptImage: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected"],
      default: "pending",
    },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const issuePaymentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, trim: true },
    paymentMethod: { type: String, required: true, trim: true },
    receiptUrl: { type: String, required: true, trim: true },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { _id: false },
);

const issueToolSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const issueReportSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true, minlength: 3 },
    description: { type: String, required: true, trim: true, minlength: 5 },
    waterConnectionCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customerCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    category: { type: String, trim: true, default: "general" },
    branch: {
      type: String,
      enum: branches,
      required: true,
      index: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, trim: true, default: "" },
    },
    attachments: { type: [String], default: [] },
    status: { type: String, enum: issueStatuses, default: "submitted" },
    assignedBranchOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedFinanceOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    toolsRequired: { type: [issueToolSchema], default: [] },
    totalEstimatedCost: { type: Number, default: 0, min: 0 },
    payment: {
      type: issuePaymentSchema,
      default: null,
    },
    paymentInfo: {
      type: issuePaymentInfoSchema,
      default: () => ({ status: "pending" }),
    },
    resolutionNotes: { type: String, trim: true, default: "" },
    workflowLogs: {
      type: [issueWorkflowLogSchema],
      default: [
        {
          action: "create_issue",
          toStatus: "submitted",
          note: "Issue submitted",
          actorRole: "citizen",
        },
      ],
    },
  },
  { timestamps: true },
);

issueReportSchema.index({ citizen: 1, createdAt: -1 });
issueReportSchema.index({ status: 1, createdAt: -1 });
issueReportSchema.index({ branch: 1, status: 1, createdAt: -1 });
issueReportSchema.index({ assignedBranchOfficer: 1, status: 1 });
issueReportSchema.index({ assignedTechnician: 1, status: 1 });
issueReportSchema.index({ assignedFinanceOfficer: 1, status: 1 });

export const IssueReport = mongoose.model("IssueReport", issueReportSchema);
