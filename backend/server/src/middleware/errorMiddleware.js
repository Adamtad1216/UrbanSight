import { isDatabaseConnected } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export function requireDatabaseConnection(req, res, next) {
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is unavailable. Please try again shortly.",
    });
  }

  return next();
}

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
}

export function globalErrorHandler(err, req, res, _next) {
  const statusCode = Number(err?.statusCode) || 500;
  logger.error("Unhandled API error", {
    path: req.originalUrl,
    method: req.method,
    statusCode,
    message: err?.message,
    stack: err?.stack,
  });

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && env.nodeEnv === "production"
        ? "Internal server error"
        : err?.message || "Internal server error",
  });
}
