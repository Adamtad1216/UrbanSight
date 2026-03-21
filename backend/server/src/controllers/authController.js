import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { signToken } from "../utils/auth.js";
import { sendError, sendOk } from "../utils/response.js";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function isStaffRole(role) {
  return [
    roles.DIRECTOR,
    roles.COORDINATOR,
    roles.SURVEYOR,
    roles.TECHNICIAN,
    roles.METER_READER,
    roles.FINANCE,
    roles.ADMIN,
  ].includes(role);
}

function sendAuthenticatedUser(res, user, statusCode = 200) {
  const token = signToken({ sub: user._id, role: user.role });
  setAuthCookie(res, token);
  return sendOk(res, { user: user.toSafeObject(), token }, statusCode);
}

export async function registerCitizen(req, res) {
  const { name, email, password, phone } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const exists = await User.findOne({ email: normalizedEmail });

  if (exists) {
    return sendError(res, 409, "Email already in use");
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    phone,
    role: roles.CITIZEN,
    firstLogin: false,
    status: "active",
  });

  return sendAuthenticatedUser(res, user, 201);
}

export async function login(req, res) {
  return loginWithRoleGuard(req, res, {
    allowedRole: roles.CITIZEN,
    forbiddenMessage:
      "Only citizens can use this login. Utility staff must use backoffice portal login.",
  });
}

export async function loginCitizenPortal(req, res) {
  return loginWithRoleGuard(req, res, {
    allowedRole: roles.CITIZEN,
    forbiddenMessage: "Only citizens can log in to citizen portal",
  });
}

export async function loginStaffPortal(req, res) {
  return loginWithRoleGuard(req, res, {
    rolePredicate: isStaffRole,
    forbiddenMessage: "Only staff users can log in to backoffice portal",
  });
}

async function loginWithRoleGuard(
  req,
  res,
  { allowedRole, rolePredicate, forbiddenMessage } = {},
) {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  if (user.status === "inactive" || !user.isActive) {
    return sendError(
      res,
      403,
      "Your account is inactive. Please contact administrator.",
    );
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return sendError(res, 401, "Incorrect password");
  }

  if (allowedRole && user.role !== allowedRole) {
    return sendError(res, 403, forbiddenMessage || "Role not allowed");
  }

  if (rolePredicate && !rolePredicate(user.role)) {
    return sendError(res, 403, forbiddenMessage || "Role not allowed");
  }

  if (user.firstLogin) {
    const token = signToken({ sub: user._id, role: user.role });
    setAuthCookie(res, token);

    return sendOk(
      res,
      {
        message: "Password change required",
        requirePasswordChange: true,
        user: user.toSafeObject(),
        token,
      },
      200,
    );
  }

  user.lastLogin = new Date();
  await user.save();

  return sendAuthenticatedUser(res, user);
}

export async function me(req, res) {
  return sendOk(res, { user: req.user.toSafeObject() });
}

export async function logout(_req, res) {
  res.clearCookie("token");
  return sendOk(res, { message: "Logged out" });
}

export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  const user = req.user;

  if (user.status === "inactive" || !user.isActive) {
    return sendError(res, 403, "Account inactive");
  }

  const isPasswordValid = await user.comparePassword(oldPassword);
  if (!isPasswordValid) {
    return sendError(res, 400, "Old password is incorrect");
  }

  if (oldPassword === newPassword) {
    return sendError(res, 400, "New password must be different");
  }

  user.password = newPassword;
  user.firstLogin = false;
  user.lastLogin = new Date();
  await user.save();

  return sendOk(res, {
    message: "Password updated successfully",
    user: user.toSafeObject(),
  });
}

export async function updateProfile(req, res) {
  const user = req.user;

  if (user.status === "inactive" || !user.isActive) {
    return sendError(res, 403, "Account inactive");
  }

  const nextName =
    req.body.name !== undefined ? String(req.body.name).trim() : undefined;
  const nextEmail =
    req.body.email !== undefined ? normalizeEmail(req.body.email) : undefined;
  const nextPhone =
    req.body.phone !== undefined ? String(req.body.phone).trim() : undefined;

  if (nextEmail && nextEmail !== user.email) {
    const exists = await User.findOne({
      email: nextEmail,
      _id: { $ne: user._id },
    });

    if (exists) {
      return sendError(res, 409, "Email already in use");
    }
  }

  if (nextName !== undefined) {
    user.name = nextName;
  }

  if (nextEmail !== undefined) {
    user.email = nextEmail;
  }

  if (nextPhone !== undefined) {
    user.phone = nextPhone;
  }

  await user.save();

  return sendOk(res, {
    message: "Profile updated successfully",
    user: user.toSafeObject(),
  });
}
