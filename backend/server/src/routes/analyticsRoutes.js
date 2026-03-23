import { Router } from "express";
import {
  getPredictionZonesAnalytics,
  getPredictionZonesAnalyticsV2,
} from "../controllers/analyticsController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.use(
  authenticate,
  authorize(roles.DIRECTOR, roles.COORDINATOR, roles.ADMIN),
);

router.get("/prediction-zones", getPredictionZonesAnalytics);
router.get("/prediction-zones-v2", getPredictionZonesAnalyticsV2);

export default router;
