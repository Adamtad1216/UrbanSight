import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  approveByDirector,
  approveByBranchOfficer,
  assignFinalTeam,
  completeImplementation,
  createNewConnectionRequest,
  getRequestById,
  listMyRequests,
  listRequests,
  manualAssignTask,
  rejectPayment,
  rejectByBranchOfficer,
  rejectByDirector,
  submitInspection,
  submitPayment,
  verifyPayment,
} from "../controllers/requestController.js";
import {
  newConnectionSchema,
  validateBody,
  requestApprovalSchema,
  inspectionSchema,
  paymentSubmissionSchema,
  paymentRejectionSchema,
  paymentVerificationSchema,
  completionSchema,
} from "../middleware/validate.js";
import { roles } from "../utils/constants.js";
import {
  requestApprovalRules,
  requestInspectionRules,
  requestPaymentRules,
  requestPaymentRejectionRules,
  requestPaymentVerificationRules,
  requestCompletionRules,
  validateRules,
} from "../middleware/requestValidation.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/new-connection",
  authenticate,
  authorize(roles.CITIZEN),
  validateBody(newConnectionSchema),
  createNewConnectionRequest,
);

router.get(
  "/my-requests",
  authenticate,
  authorize(roles.CITIZEN),
  listMyRequests,
);

router.get("/my", authenticate, authorize(roles.CITIZEN), listMyRequests);

router.get(
  "/",
  authenticate,
  authorize(
    roles.DIRECTOR,
    roles.COORDINATOR,
    roles.SURVEYOR,
    roles.TECHNICIAN,
    roles.METER_READER,
    roles.FINANCE,
    roles.ADMIN,
  ),
  listRequests,
);

router.get("/:id", authenticate, getRequestById);

router.patch(
  "/request/:id/approve",
  authenticate,
  authorize(roles.DIRECTOR),
  requestApprovalRules,
  validateRules,
  validateBody(requestApprovalSchema),
  approveByDirector,
);

router.patch(
  "/request/:id/reject",
  authenticate,
  authorize(roles.DIRECTOR),
  requestApprovalRules,
  validateRules,
  validateBody(requestApprovalSchema),
  rejectByDirector,
);

router.patch(
  "/request/:id/inspection",
  authenticate,
  authorize(roles.SURVEYOR),
  requestInspectionRules,
  validateRules,
  validateBody(inspectionSchema),
  submitInspection,
);

router.post(
  "/request/:id/payment",
  authenticate,
  authorize(roles.CITIZEN),
  upload.single("receipt"),
  requestPaymentRules,
  validateRules,
  validateBody(paymentSubmissionSchema),
  submitPayment,
);

router.patch(
  "/request/:id/payment/verify",
  authenticate,
  authorize(roles.FINANCE),
  requestPaymentVerificationRules,
  validateRules,
  validateBody(paymentVerificationSchema),
  verifyPayment,
);

router.patch(
  "/request/:id/payment/reject",
  authenticate,
  authorize(roles.FINANCE),
  requestPaymentRejectionRules,
  validateRules,
  validateBody(paymentRejectionSchema),
  rejectPayment,
);

router.patch(
  "/request/:id/branch-officer/approve",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR, roles.COORDINATOR),
  requestApprovalRules,
  validateRules,
  validateBody(requestApprovalSchema),
  approveByBranchOfficer,
);

router.patch(
  "/request/:id/branch-officer/reject",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR, roles.COORDINATOR),
  requestApprovalRules,
  validateRules,
  validateBody(requestApprovalSchema),
  rejectByBranchOfficer,
);

router.patch(
  "/request/:id/assign-final-team",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR, roles.COORDINATOR),
  requestApprovalRules,
  validateRules,
  validateBody(requestApprovalSchema),
  assignFinalTeam,
);

router.patch(
  "/request/:id/manual-assign",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR, roles.COORDINATOR),
  manualAssignTask,
);

router.patch(
  "/request/:id/complete",
  authenticate,
  authorize(roles.TECHNICIAN),
  requestCompletionRules,
  validateRules,
  validateBody(completionSchema),
  completeImplementation,
);

export default router;
