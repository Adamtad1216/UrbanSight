import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { roles } from "../utils/constants.js";
import {
  getSystemStatus,
  getSystemSettingsForAdmin,
  patchSystemSettings,
} from "../controllers/systemController.js";

const router = Router();

router.get(
  "/status",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR),
  getSystemStatus,
);

router.get(
  "/settings",
  authenticate,
  authorize(roles.ADMIN),
  getSystemSettingsForAdmin,
);

router.patch(
  "/settings",
  authenticate,
  authorize(roles.ADMIN),
  patchSystemSettings,
);

export default router;
