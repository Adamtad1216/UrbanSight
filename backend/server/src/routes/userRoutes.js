import { Router } from "express";
import {
  createStaff,
  listStaffDirectory,
  resetUserPassword,
  listUsers,
  updateUserRole,
} from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createStaffSchema,
  updateUserSchema,
  validateBody,
} from "../middleware/validate.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get(
  "/staff-directory",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR, roles.COORDINATOR),
  listStaffDirectory,
);

router.use(authenticate, authorize(roles.ADMIN));
router.get("/", listUsers);
router.post("/staff", validateBody(createStaffSchema), createStaff);
router.patch("/:id", validateBody(updateUserSchema), updateUserRole);
router.post("/:id/reset-password", resetUserPassword);

export default router;
