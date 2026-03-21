import { body, validationResult } from "express-validator";
import { sendError } from "../utils/response.js";

export const requestApprovalRules = [
  body("note").optional().isString().isLength({ max: 500 }),
];

export const requestInspectionRules = [
  body("toolsRequired")
    .isArray({ min: 1 })
    .withMessage("toolsRequired must be a non-empty array"),
  body("toolsRequired.*.toolId")
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Tool ID is required"),
  body("toolsRequired.*.quantity")
    .isFloat({ gt: 0 })
    .withMessage("Tool quantity must be greater than 0"),
  body("notes").isString().trim().isLength({ min: 3 }),
];

export const requestPaymentRules = [
  body("transactionId").isString().trim().isLength({ min: 2 }),
  body("paymentMethod").isString().trim().isLength({ min: 2 }),
];

export const requestPaymentVerificationRules = [
  body("note").optional().isString().trim().isLength({ max: 500 }),
];

export const requestPaymentRejectionRules = [
  body("rejectionReason").isString().trim().isLength({ min: 3 }),
];

export const requestCompletionRules = [
  body("note").optional().isString().isLength({ max: 500 }),
];

export const issueCreationRules = [
  body("title").isString().trim().isLength({ min: 3 }),
  body("description").isString().trim().isLength({ min: 5 }),
  body("waterConnectionCode")
    .isString()
    .trim()
    .isLength({ min: 4 })
    .withMessage("Water connection code is required"),
  body("customerCode")
    .isString()
    .trim()
    .isLength({ min: 4 })
    .withMessage("Customer code is required"),
  body("category").optional().isString().trim().isLength({ min: 2 }),
  body("location.latitude").isFloat({ min: -90, max: 90 }),
  body("location.longitude").isFloat({ min: -180, max: 180 }),
  body("location.address").optional().isString(),
  body("attachments").optional().isArray(),
  body("attachments.*").optional().isString().isURL(),
];

export const issueApproveRules = [
  body("note").optional().isString().isLength({ max: 500 }),
];

export const issueTechnicianUpdateRules = [
  body("toolsRequired").optional().isArray(),
  body("toolsRequired.*.code")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 }),
  body("toolsRequired.*.description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 }),
  body("toolsRequired.*.source")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 }),
  body("toolsRequired.*.quantity").optional().isFloat({ gt: 0 }),
  body("toolsRequired.*.unitPrice").optional().isFloat({ gt: 0 }),
  body("note").optional().isString().trim().isLength({ max: 500 }),
];

export const issuePaymentRules = [
  body("transactionId").isString().trim().isLength({ min: 2 }),
  body("paymentMethod").isString().trim().isLength({ min: 2 }),
];

export const issuePaymentVerificationRules = [
  body("note").optional().isString().trim().isLength({ max: 500 }),
];

export const issuePaymentRejectionRules = [
  body("rejectionReason").isString().trim().isLength({ min: 3 }),
];

export const issueFinalizeRules = [
  body("note").optional().isString().trim().isLength({ max: 500 }),
];

export function validateRules(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return sendError(res, 400, result.array()[0]?.msg || "Validation failed");
  }

  return next();
}
