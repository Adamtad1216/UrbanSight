import { Router } from "express";
import { getLandingMetrics } from "../controllers/publicController.js";

const router = Router();

router.get("/landing-metrics", getLandingMetrics);

export default router;
