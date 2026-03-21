import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { roles } from "../utils/constants.js";
import {
  getConfiguration,
  updateConfiguration,
} from "../controllers/configurationController.js";
import {
  updateConfigurationSchema,
  validateBody,
} from "../middleware/validate.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(
    roles.ADMIN,
    roles.DIRECTOR,
    roles.COORDINATOR,
    roles.SURVEYOR,
    roles.TECHNICIAN,
    roles.METER_READER,
    roles.FINANCE,
    roles.CITIZEN,
  ),
  getConfiguration,
);

router.patch(
  "/",
  authenticate,
  authorize(roles.ADMIN, roles.DIRECTOR),
  validateBody(updateConfigurationSchema),
  updateConfiguration,
);

export default router;
