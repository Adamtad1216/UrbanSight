import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import authRoutes from "./routes/authRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import configurationRoutes from "./routes/configurationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { checkMaintenanceMode } from "./middleware/maintenanceMode.js";
import { env } from "./config/env.js";

const app = express();
const isTest = env.nodeEnv === "test";
const isProduction = env.nodeEnv === "production";

function sanitizePayloadInPlace(value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => sanitizePayloadInPlace(entry));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }

    sanitizePayloadInPlace(value[key]);
  }
}

function sanitizeRequest(req, _res, next) {
  sanitizePayloadInPlace(req.body);
  sanitizePayloadInPlace(req.params);
  sanitizePayloadInPlace(req.query);

  next();
}

function isAllowedLocalDevOrigin(origin) {
  if (typeof origin !== "string") {
    return false;
  }

  const normalizedOrigin = origin.trim().toLowerCase();
  return (
    normalizedOrigin === "http://localhost" ||
    normalizedOrigin === "http://127.0.0.1" ||
    normalizedOrigin.startsWith("http://localhost:") ||
    normalizedOrigin.startsWith("http://127.0.0.1:")
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests and same-origin calls with no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Allow localhost origins for local development and tests.
      if (!isProduction && isAllowedLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
if (!isTest) {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests. Please try again later.",
      },
    }),
  );

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many authentication attempts. Please try again later.",
      },
    }),
  );
}
app.use(express.json({ limit: "10mb" }));
app.use(sanitizeRequest);
app.use(hpp());
app.use(cookieParser());
app.use(passport.initialize());

app.get("/api", (_req, res) => {
  res.json({
    success: true,
    message: "UrbanSight API root",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      requests: "/api/requests",
      issues: "/api/issues",
      users: "/api/users",
      uploads: "/api/uploads",
      tools: "/api/tools",
      configuration: "/api/configuration",
      notifications: "/api/notifications",
      analytics: "/api/analytics",
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "UrbanSight API running" });
});

app.use(checkMaintenanceMode);

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/users", userRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/configuration", configurationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((err, _req, res, _next) => {
  if (!isProduction) {
    console.error(err);
  }

  return res.status(500).json({
    success: false,
    message: isProduction
      ? "Internal server error"
      : err?.message || "Internal server error",
  });
});

export default app;
