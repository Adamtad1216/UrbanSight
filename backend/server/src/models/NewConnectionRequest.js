import mongoose from "mongoose";
import { branches, requestStatuses } from "../utils/constants.js";

const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const normalizePhoneNumber = (value) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .trim();

const workflowLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    fromStatus: { type: String, enum: requestStatuses },
    toStatus: { type: String, enum: requestStatuses, required: true },
    note: { type: String, default: "", trim: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, default: "system" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const inspectionReportSchema = new mongoose.Schema(
  {
    requiredTools: { type: [String], default: [] },
    notes: { type: String, required: true, trim: true },
    estimatedCost: { type: Number, required: true, min: 0 },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
  },
  { _id: false },
);

const inspectionSchema = new mongoose.Schema(
  {
    surveyor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true, default: "" },
    submittedAt: { type: Date },
  },
  { _id: false },
);

const toolRequiredSchema = new mongoose.Schema(
  {
    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tool",
      required: true,
    },
    code: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    measurement: { type: String, required: true, trim: true },
    stockPrice: { type: Number, required: true, min: 0 },
    customerUnitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const paymentInfoSchema = new mongoose.Schema(
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

const paymentSchema = new mongoose.Schema(
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

const adjustmentSchema = new mongoose.Schema(
  {
    requested: { type: Boolean, default: false },
    reason: { type: String, trim: true, default: "" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requestedByRole: { type: String, trim: true, default: "" },
    requestedAt: { type: Date },
    returnStatus: { type: String, enum: requestStatuses },
  },
  { _id: false },
);

const implementationCompletionSchema = new mongoose.Schema(
  {
    technicianCompletions: {
      type: [
        new mongoose.Schema(
          {
            technician: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            completedAt: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { _id: false },
);

const newConnectionRequestSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: { type: String, required: true, minlength: 3, trim: true },
    customerNameAmharic: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 80,
      match: [/^[\u1200-\u137F\s]+$/, "Invalid Amharic customer name"],
      trim: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    tinNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "TIN number must be exactly 10 digits"],
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      set: normalizePhoneNumber,
      match: [
        etPhoneRegex,
        "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX",
      ],
    },
    numberOfFamily: { type: Number, required: true, min: 1, max: 30 },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 150,
    },
    houseNumberZone: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    readingZone: { type: String, required: true, trim: true },
    meterSize: {
      type: String,
      enum: [
        "15mm",
        "20mm",
        "25mm",
        "32mm",
        "3/8 Inch",
        "1/4 Inch",
        "1/2 Inch",
        "3/4 Inch",
        "1 Inch",
        "1 1/2 Inch",
        "2 Inch",
      ],
      required: true,
    },
    customerGroup: {
      type: String,
      enum: [
        "Domestic",
        "Commercial",
        "Government",
        "Residential",
        "Industry",
        "Communal",
        "Hydrant",
        "NGO",
        "Religious Organization",
        "Public Fountain",
        "Master Meter",
        "Bono",
        "Administrative",
        "Employee",
        "Lavaggio",
        "Public Health Institute",
        "Regional and Federal Institution",
        "Local Government",
      ],
      required: true,
    },
    type: {
      type: String,
      enum: ["Private", "Shared", "Tap", "Hydrant", "Cattle Drink", "Well"],
      required: true,
    },
    serviceType: {
      type: String,
      default: "New Water Connection",
      required: true,
    },
    description: { type: String, maxlength: 500, default: "" },
    branch: {
      type: String,
      enum: branches,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true, min: 3, max: 15 },
      longitude: { type: Number, required: true, min: 33, max: 48 },
    },
    housePlan: { type: String, required: true },
    idCard: { type: String, required: true },
    attachments: { type: [String], default: [] },
    status: { type: String, enum: requestStatuses, default: "submitted" },
    assignedSurveyor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTechnicians: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    assignedFinanceOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBranchOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedMeterReader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    waterConnectionCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
      set: (value) =>
        value == null || String(value).trim() === "" ? undefined : value,
    },
    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
      set: (value) =>
        value == null || String(value).trim() === "" ? undefined : value,
    },
    branchApprovalStage: {
      type: Number,
      min: 0,
      max: 3,
      default: 0,
    },
    inspectionReport: {
      type: inspectionReportSchema,
      default: null,
    },
    inspection: {
      type: inspectionSchema,
      default: null,
    },
    toolsRequired: {
      type: [toolRequiredSchema],
      default: [],
    },
    totalEstimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    payment: {
      type: paymentSchema,
      default: null,
    },
    paymentInfo: {
      type: paymentInfoSchema,
      default: () => ({ status: "pending" }),
    },
    implementationCompletion: {
      type: implementationCompletionSchema,
      default: () => ({ technicianCompletions: [] }),
    },
    adjustment: {
      type: adjustmentSchema,
      default: () => ({ requested: false, reason: "" }),
    },
    workflowLogs: {
      type: [workflowLogSchema],
      default: [
        {
          action: "create_request",
          toStatus: "submitted",
          note: "Request submitted",
          actorRole: "citizen",
        },
      ],
    },
  },
  { timestamps: true },
);

newConnectionRequestSchema.index({ citizen: 1, createdAt: -1 });
newConnectionRequestSchema.index({ status: 1, createdAt: -1 });
newConnectionRequestSchema.index({ branch: 1, status: 1, createdAt: -1 });
newConnectionRequestSchema.index({ assignedSurveyor: 1, status: 1 });
newConnectionRequestSchema.index({ assignedTechnicians: 1, status: 1 });
newConnectionRequestSchema.index({ assignedFinanceOfficer: 1, status: 1 });
newConnectionRequestSchema.index({ assignedBranchOfficer: 1, status: 1 });
newConnectionRequestSchema.index({ assignedMeterReader: 1, status: 1 });
newConnectionRequestSchema.index(
  { waterConnectionCode: 1 },
  { unique: true, sparse: true },
);
newConnectionRequestSchema.index(
  { customerCode: 1 },
  { unique: true, sparse: true },
);

export const NewConnectionRequest = mongoose.model(
  "NewConnectionRequest",
  newConnectionRequestSchema,
);
