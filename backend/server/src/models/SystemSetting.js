import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    autoAssignTasks: { type: Boolean, default: true },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);
