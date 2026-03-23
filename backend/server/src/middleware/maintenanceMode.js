import { verifyToken } from "../utils/auth.js";
import { getSystemSettings } from "../services/systemSettingService.js";

function isLoginRoute(path) {
  return (
    path === "/api/auth/login" ||
    path === "/api/auth/login-citizen" ||
    path === "/api/auth/login-staff"
  );
}

function readToken(req) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  return bearerToken || cookieToken || null;
}

function isAdminFromToken(req) {
  const token = readToken(req);
  if (!token) return false;

  try {
    const decoded = verifyToken(token);
    return decoded?.role === "admin";
  } catch {
    return false;
  }
}

export async function checkMaintenanceMode(req, res, next) {
  if (isLoginRoute(req.path)) {
    return next();
  }

  const requestPath = req.path || "";
  const originalPath = req.originalUrl || "";
  if (
    requestPath === "/api/system/status" ||
    requestPath === "/system/status" ||
    originalPath.startsWith("/api/system/status")
  ) {
    return next();
  }

  const settings = await getSystemSettings();

  if (!settings.maintenanceMode) {
    return next();
  }

  if (isAdminFromToken(req)) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: "System under maintenance. Please try later.",
  });
}
