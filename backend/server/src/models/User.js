import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { branches, roles } from "../utils/constants.js";

const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const normalizePhoneNumber = (value) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .trim();

function isBranchRequiredRole(role) {
  return (
    role !== roles.CITIZEN && role !== roles.ADMIN && role !== roles.DIRECTOR
  );
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    phone: {
      type: String,
      trim: true,
      default: "",
      set: normalizePhoneNumber,
      validate: {
        validator: (value) => value === "" || etPhoneRegex.test(value),
        message:
          "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX",
      },
    },
    role: {
      type: String,
      enum: Object.values(roles),
      default: roles.CITIZEN,
      required: true,
    },
    branch: {
      type: String,
      enum: branches,
      required: function requireBranchForStaff() {
        return isBranchRequiredRole(this.role);
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    firstLogin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

// Allow multiple empty phone values, but enforce uniqueness for real numbers.
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $gt: "" },
    },
  },
);

userSchema.pre("save", async function hashPassword() {
  if (this.role === roles.CITIZEN) {
    this.branch = undefined;
  }

  if (this.isModified("status")) {
    this.isActive = this.status === "active";
  }

  if (this.isModified("isActive")) {
    this.status = this.isActive ? "active" : "inactive";
  }

  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    branch: this.branch,
    status: this.status,
    firstLogin: this.firstLogin,
    isActive: this.status === "active",
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);
