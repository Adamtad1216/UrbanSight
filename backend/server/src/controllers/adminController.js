import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { sendStaffCredentialsEmail } from "../utils/email.js";
import { generateTemporaryPassword } from "../utils/password.js";
import { sendError, sendOk } from "../utils/response.js";
import { notifyAccountCreated } from "../services/accountNotificationService.js";
import * as XLSX from "xlsx";

const EXPECTED_STAFF_IMPORT_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Role",
  "Branch",
  "Status",
  "Password",
];

const NORMALIZED_STAFF_HEADERS = EXPECTED_STAFF_IMPORT_HEADERS.map((header) =>
  normalizeHeader(header),
);

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toText(value) {
  return String(value ?? "").trim();
}

function normalizePhone(phone) {
  return String(phone ?? "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "inactive" ? "inactive" : "active";
}

function isEmptyRow(row = []) {
  return row.every((value) => toText(value) === "");
}

async function createStaffAccount({
  name,
  email,
  role,
  status,
  password,
  branch,
  phone,
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!name || name.length < 3) {
    return {
      ok: false,
      code: 400,
      message: "Name must be at least 3 characters",
    };
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, code: 400, message: "Invalid email address" };
  }

  if (!isStaffRole(role)) {
    return { ok: false, code: 400, message: "Invalid staff role" };
  }

  if (requiresBranch(role) && !branch) {
    return {
      ok: false,
      code: 400,
      message: "Branch is required for staff users",
    };
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return { ok: false, code: 409, message: "Email already in use" };
  }

  if (normalizedPhone) {
    const existingPhoneUser = await User.findOne({
      phone: normalizedPhone,
    }).lean();
    if (existingPhoneUser) {
      return { ok: false, code: 409, message: "Phone number already in use" };
    }
  }

  const temporaryPassword = password || generateTemporaryPassword();

  const createdUser = await User.create({
    name,
    email: normalizedEmail,
    password: temporaryPassword,
    role,
    branch: requiresBranch(role) ? branch : undefined,
    firstLogin: true,
    phone: normalizedPhone,
    status,
    isActive: status === "active",
  });

  let credentialsEmailSent = true;
  try {
    await sendStaffCredentialsEmail({
      name,
      email: normalizedEmail,
      tempPassword: temporaryPassword,
    });
  } catch (_error) {
    credentialsEmailSent = false;
  }

  try {
    await notifyAccountCreated({ user: createdUser });
  } catch {
    // Staff account creation should succeed even if notification delivery fails.
  }

  return {
    ok: true,
    user: createdUser,
    temporaryPassword,
    credentialsEmailSent,
  };
}

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
  const accountStatus = normalizeStatus(status);

  try {
    const result = await createStaffAccount({
      name,
      email,
      role,
      status: accountStatus,
      password,
      branch,
      phone: req.body.phone || "",
    });

    if (!result.ok) {
      return sendError(res, result.code, result.message);
    }

    const { user, credentialsEmailSent, temporaryPassword } = result;

    const baseResponse = {
      user: user.toSafeObject(),
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

export async function importStaffByAdmin(req, res) {
  if (!req.file) {
    return sendError(res, 400, "Import file is required");
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
      return sendError(res, 400, "Import file does not contain a worksheet");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    if (!Array.isArray(grid) || grid.length === 0) {
      return sendError(res, 400, "Import file is empty");
    }

    const headerRow = Array.isArray(grid[0]) ? grid[0] : [];
    const normalizedHeaders = headerRow.map((header) =>
      normalizeHeader(header),
    );
    const requiredHeaders = normalizedHeaders.slice(
      0,
      NORMALIZED_STAFF_HEADERS.length,
    );
    const trailingHeaders = normalizedHeaders.slice(
      NORMALIZED_STAFF_HEADERS.length,
    );

    const hasValidRequiredHeaders = NORMALIZED_STAFF_HEADERS.every(
      (expected, index) => requiredHeaders[index] === expected,
    );
    const hasUnexpectedExtraHeaders = trailingHeaders.some(
      (header) => header !== "",
    );

    if (!hasValidRequiredHeaders || hasUnexpectedExtraHeaders) {
      return sendError(
        res,
        400,
        `Invalid import headers. Expected: ${EXPECTED_STAFF_IMPORT_HEADERS.join(", ")}`,
      );
    }

    let successCount = 0;
    const errors = [];

    for (let rowIndex = 1; rowIndex < grid.length; rowIndex += 1) {
      const rowValues = Array.isArray(grid[rowIndex]) ? grid[rowIndex] : [];
      const excelRowNumber = rowIndex + 1;

      if (isEmptyRow(rowValues)) {
        continue;
      }

      const name = toText(rowValues[0]);
      const email = toText(rowValues[1]);
      const phone = toText(rowValues[2]);
      const role = toText(rowValues[3]).toLowerCase();
      const branch = toText(rowValues[4]) || undefined;
      const status = normalizeStatus(rowValues[5]);
      const password = toText(rowValues[6]) || undefined;

      try {
        const result = await createStaffAccount({
          name,
          email,
          phone,
          role,
          branch,
          status,
          password,
        });

        if (!result.ok) {
          errors.push({ row: excelRowNumber, message: result.message });
          continue;
        }

        if (!result.credentialsEmailSent) {
          errors.push({
            row: excelRowNumber,
            message:
              "Account created, but credentials email failed. Share temporary password manually.",
          });
        }

        successCount += 1;
      } catch (error) {
        errors.push({
          row: excelRowNumber,
          message: error?.message || "Failed to import row",
        });
      }
    }

    return sendOk(res, {
      successCount,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    return sendError(res, 400, error?.message || "Failed to parse import file");
  }
}
