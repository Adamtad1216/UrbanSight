import { Router } from "express";
import {
  createStaffByAdmin,
  importStaffByAdmin,
} from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody, createStaffSchema } from "../middleware/validate.js";
import { roles } from "../utils/constants.js";
import { uploadStaffImportFile } from "../middleware/staffImportUpload.js";

const router = Router();

router.post(
  "/create-staff",
  authenticate,
  authorize(roles.ADMIN),
  validateBody(createStaffSchema),
  createStaffByAdmin,
);

router.post(
  "/import-staff",
  authenticate,
  authorize(roles.ADMIN),
  uploadStaffImportFile,
  importStaffByAdmin,
);

export default router;
