import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { sendError, sendOk } from "../utils/response.js";
import { createStaffByAdmin } from "./adminController.js";
import { generateTemporaryPassword } from "../utils/password.js";
import { sendStaffCredentialsEmail } from "../utils/email.js";

function requiresBranch(role) {
  return (
    role !== roles.CITIZEN && role !== roles.ADMIN && role !== roles.DIRECTOR
  );
}

function normalizePhone(phone) {
  return String(phone ?? "")
    .replace(/\s+/g, "")
    .trim();
}

export async function listStaffDirectory(_req, res) {
  const users = await User.find({
    role: { $ne: roles.CITIZEN },
    status: "active",
  })
    .select("name email role phone branch")
    .sort({ role: 1, name: 1 })
    .lean();

  return sendOk(res, { users });
}

export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  return sendOk(res, { users: users.map((user) => user.toSafeObject()) });
}

export async function createStaff(req, res) {
  return createStaffByAdmin(req, res);
}

export async function updateUserRole(req, res) {
  const { role, status, isActive, name, email, phone, branch } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return sendError(res, 404, "User not found");
  }

  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return sendError(res, 409, "Email already in use");
    }

    user.email = normalizedEmail;
  }

  const normalizedPhone =
    phone !== undefined ? normalizePhone(phone) : undefined;

  if (normalizedPhone !== undefined && normalizedPhone !== user.phone) {
    const existingPhoneUser = await User.findOne({
      phone: normalizedPhone,
      _id: { $ne: user._id },
    }).lean();

    if (existingPhoneUser) {
      return sendError(res, 409, "Phone number already in use");
    }
  }

  if (name) user.name = name;
  if (normalizedPhone !== undefined) user.phone = normalizedPhone;
  if (role) user.role = role;
  if (branch !== undefined) user.branch = branch;

  if (requiresBranch(user.role) && !user.branch) {
    return sendError(res, 400, "Branch is required for staff users");
  }

  if (user.role === roles.CITIZEN) {
    user.branch = undefined;
  }

  if (status) {
    user.status = status;
    user.isActive = status === "active";
  }

  if (typeof isActive === "boolean") {
    user.isActive = isActive;
    user.status = isActive ? "active" : "inactive";
  }

  await user.save();

  return sendOk(res, { user: user.toSafeObject() });
}

export async function resetUserPassword(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return sendError(res, 404, "User not found");
  }

  if (user.role === roles.CITIZEN) {
    return sendError(res, 400, "Password reset is for staff users only");
  }

  const temporaryPassword = generateTemporaryPassword();
  user.password = temporaryPassword;
  user.firstLogin = true;
  await user.save();

  try {
    await sendStaffCredentialsEmail({
      name: user.name,
      email: user.email,
      tempPassword: temporaryPassword,
    });
  } catch {
    return sendError(
      res,
      500,
      "Password was reset, but sending the email failed. Verify SMTP settings.",
    );
  }

  return sendOk(res, { message: "Temporary password sent to user email" });
}
