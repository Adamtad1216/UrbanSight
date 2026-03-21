import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { roles } from "../utils/constants.js";
import {
  getDashboardActivity,
  getDashboardCharts,
  getDashboardStats,
} from "../controllers/dashboardController.js";

const router = Router();

router.use(
  authenticate,
  authorize(
    roles.CITIZEN,
    roles.DIRECTOR,
    roles.COORDINATOR,
    roles.SURVEYOR,
    roles.TECHNICIAN,
    roles.METER_READER,
    roles.FINANCE,
    roles.ADMIN,
  ),
);

router.get("/stats", getDashboardStats);
router.get("/activity", getDashboardActivity);
router.get("/charts", getDashboardCharts);

export default router;
