import { Router } from "express";
import {
  changePassword,
  login,
  loginCitizenPortal,
  loginStaffPortal,
  logout,
  me,
  updateProfile,
  registerCitizen,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  registerSchema,
  validateBody,
} from "../middleware/validate.js";

const router = Router();

router.post("/register", validateBody(registerSchema), registerCitizen);
router.post("/login", validateBody(loginSchema), login);
router.post("/login-citizen", validateBody(loginSchema), loginCitizenPortal);
router.post("/login-staff", validateBody(loginSchema), loginStaffPortal);
router.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);
router.patch(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  updateProfile,
);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
