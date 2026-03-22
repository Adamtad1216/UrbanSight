import mongoose from "mongoose";

const configurationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    workflow: {
      requiredTechniciansForCompletion: {
        type: Number,
        default: 2,
        min: 1,
        max: 10,
      },
      autoAssignSurveyor: { type: Boolean, default: true },
      autoAssignTechnicians: { type: Boolean, default: true },
      autoAssignMeterReader: { type: Boolean, default: true },
    },
    payments: {
      requireReceiptUpload: { type: Boolean, default: true },
      allowResubmissionAfterRejection: { type: Boolean, default: true },
      supportedMethods: { type: [String], default: [] },
    },
    tools: {
      maxImportFileSizeMb: { type: Number, default: 5, min: 1, max: 50 },
      updateDuplicateCodeOnImport: { type: Boolean, default: true },
    },
    notifications: {
      notifyCitizenOnStatusChange: { type: Boolean, default: true },
      notifyAssigneeOnAutoAssignment: { type: Boolean, default: true },
    },
    citizenPortal: {
      showAssignedMeterReaderInfo: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const Configuration = mongoose.model(
  "Configuration",
  configurationSchema,
);
