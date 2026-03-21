import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createTool,
  deleteTool,
  importTools,
  listTools,
  updateTool,
} from "../controllers/toolController.js";
import {
  createToolSchema,
  updateToolSchema,
  validateBody,
} from "../middleware/validate.js";
import { roles } from "../utils/constants.js";
import { uploadToolsImportFile } from "../middleware/toolImportUpload.js";

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
  ),
  listTools,
);

router.post(
  "/",
  authenticate,
  authorize(roles.ADMIN),
  validateBody(createToolSchema),
  createTool,
);

router.post(
  "/import",
  authenticate,
  authorize(roles.ADMIN),
  uploadToolsImportFile,
  importTools,
);

router.patch(
  "/:id",
  authenticate,
  authorize(roles.ADMIN),
  validateBody(updateToolSchema),
  updateTool,
);

router.delete("/:id", authenticate, authorize(roles.ADMIN), deleteTool);

export default router;
