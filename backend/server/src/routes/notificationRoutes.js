import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getNotificationSummary,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/", listMyNotifications);
router.get("/summary", getNotificationSummary);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/read-all", markAllNotificationsAsRead);

export default router;
