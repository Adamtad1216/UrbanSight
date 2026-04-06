import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth.js";
import { roles } from "../utils/constants.js";
import {
  issueApproveRules,
  issueCreationRules,
  issueFinalizeRules,
  issuePaymentRules,
  issuePaymentRejectionRules,
  issuePaymentVerificationRules,
  issueTechnicianUpdateRules,
  validateRules,
} from "../middleware/requestValidation.js";
import {
  issueSchema,
  issueTechnicianUpdateSchema,
  paymentRejectionSchema,
  paymentSubmissionSchema,
  paymentVerificationSchema,
  requestApprovalSchema,
  validateBody,
} from "../middleware/validate.js";
import {
  approveIssue,
  assignIssueTechnician,
  createIssue,
  finalizeIssueFix,
  listIssues,
  listMyIssues,
  rejectIssue,
  rejectIssuePayment,
  submitIssuePayment,
  technicianUpdate,
  verifyIssuePayment,
} from "../controllers/issueController.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/",
  authenticate,
  authorize(roles.CITIZEN),
  issueCreationRules,
  validateRules,
  validateBody(issueSchema),
  createIssue,
);

router.get("/my", authenticate, authorize(roles.CITIZEN), listMyIssues);

router.get(
  "/",
  authenticate,
  authorize(
    roles.COORDINATOR,
    roles.TECHNICIAN,
    roles.FINANCE,
    roles.ADMIN,
    roles.DIRECTOR,
  ),
  listIssues,
);

router.patch(
  "/:id/assign",
  authenticate,
  authorize(roles.COORDINATOR),
  assignIssueTechnician,
);

router.patch(
  "/:id/approve",
  authenticate,
  authorize(roles.COORDINATOR),
  issueApproveRules,
  validateRules,
  validateBody(requestApprovalSchema),
  approveIssue,
);

router.patch(
  "/:id/reject",
  authenticate,
  authorize(roles.COORDINATOR, roles.ADMIN, roles.DIRECTOR),
  issueApproveRules,
  validateRules,
  validateBody(requestApprovalSchema),
  rejectIssue,
);

router.patch(
  "/:id/technician-update",
  authenticate,
  authorize(roles.TECHNICIAN),
  issueTechnicianUpdateRules,
  validateRules,
  validateBody(issueTechnicianUpdateSchema),
  technicianUpdate,
);

router.post(
  "/:id/payment",
  authenticate,
  authorize(roles.CITIZEN),
  upload.single("receipt"),
  issuePaymentRules,
  validateRules,
  validateBody(paymentSubmissionSchema),
  submitIssuePayment,
);

router.patch(
  "/:id/payment/verify",
  authenticate,
  authorize(roles.FINANCE),
  issuePaymentVerificationRules,
  validateRules,
  validateBody(paymentVerificationSchema),
  verifyIssuePayment,
);

router.patch(
  "/:id/payment/reject",
  authenticate,
  authorize(roles.FINANCE),
  issuePaymentRejectionRules,
  validateRules,
  validateBody(paymentRejectionSchema),
  rejectIssuePayment,
);

router.patch(
  "/:id/finalize",
  authenticate,
  authorize(roles.TECHNICIAN),
  issueFinalizeRules,
  validateRules,
  finalizeIssueFix,
);

export default router;
