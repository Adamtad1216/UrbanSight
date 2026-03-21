import { Router } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../controllers/uploadController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/cloudinary",
  authenticate,
  upload.single("file"),
  uploadToCloudinary,
);

export default router;
