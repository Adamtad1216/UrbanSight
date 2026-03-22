import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { sendStaffCredentialsEmail } from "../utils/email.js";
import { generateTemporaryPassword } from "../utils/password.js";
import { sendError, sendOk } from "../utils/response.js";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isStaffRole(role) {
  return role && role !== roles.CITIZEN && Object.values(roles).includes(role);
}

function requiresBranch(role) {
  return (
    role !== roles.CITIZEN && role !== roles.ADMIN && role !== roles.DIRECTOR
  );
}

export async function createStaffByAdmin(req, res) {
  const { name, email, role, status, password, branch } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!isStaffRole(role)) {
    return sendError(res, 400, "Invalid staff role");
  }

  if (requiresBranch(role) && !branch) {
    return sendError(res, 400, "Branch is required for staff users");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return sendError(res, 409, "Email already in use");
  }

  const temporaryPassword = password || generateTemporaryPassword();

  try {
    const createdUser = await User.create({
      name,
      email: normalizedEmail,
      password: temporaryPassword,
      role,
      branch: requiresBranch(role) ? branch : undefined,
      firstLogin: true,
      phone: req.body.phone || "",
      status: status || "active",
      isActive: (status || "active") === "active",
    });

    let credentialsEmailSent = true;
    try {
      await sendStaffCredentialsEmail({
        name,
        email: normalizedEmail,
        tempPassword: temporaryPassword,
      });
    } catch (_emailError) {
      credentialsEmailSent = false;
    }

    const baseResponse = {
      user: createdUser.toSafeObject(),
      credentialsEmailSent,
    };

    if (!credentialsEmailSent) {
      return sendOk(
        res,
        {
          ...baseResponse,
          message:
            "Staff account created, but credential email failed to send. Configure SMTP and share temporary password manually.",
          temporaryPassword,
        },
        201,
      );
    }

    return sendOk(
      res,
      {
        ...baseResponse,
        message: "Staff account created and credentials email sent",
      },
      201,
    );
  } catch (_error) {
    return sendError(res, 500, "Unable to create staff account");
  }
}
