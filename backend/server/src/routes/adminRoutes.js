import { Router } from "express";
import { createStaffByAdmin } from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody, createStaffSchema } from "../middleware/validate.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.post(
  "/create-staff",
  authenticate,
  authorize(roles.ADMIN),
  validateBody(createStaffSchema),
  createStaffByAdmin,
);

export default router;
