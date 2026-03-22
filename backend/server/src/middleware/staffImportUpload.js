import multer from "multer";
import path from "node:path";
import { sendError } from "../utils/response.js";

const ACCEPTED_EXTENSIONS = new Set([".xlsx", ".csv"]);
const ACCEPTED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isAcceptedType = ACCEPTED_MIME_TYPES.has(file.mimetype);
    const isAcceptedExtension = ACCEPTED_EXTENSIONS.has(extension);

    if (!isAcceptedType && !isAcceptedExtension) {
      callback(new Error("Only .xlsx and .csv files are allowed"));
      return;
    }

    callback(null, true);
  },
});

export function uploadStaffImportFile(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      sendError(res, 400, "Import file exceeds 5MB size limit");
      return;
    }

    sendError(res, 400, error.message || "Invalid import file");
  });
}
