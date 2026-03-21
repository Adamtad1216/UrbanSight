import mongoose from "mongoose";

const toolSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: { type: String, required: true, trim: true },
    source: {
      type: String,
      required: true,
      trim: true,
      enum: ["Warehouse", "Store", "Local", "Service"],
    },
    measurement: { type: String, required: true, trim: true },
    stockPrice: { type: Number, required: true, min: 0 },
    customerPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Tool = mongoose.model("Tool", toolSchema);
