import { User } from "../models/User.js";
import { verifyToken } from "../utils/auth.js";
import { sendError } from "../utils/response.js";

export async function authenticate(req, res, next) {
  try {
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    // Prefer explicit Bearer token so a stale cookie cannot override a fresh token.
    const token = bearerToken || cookieToken;

    if (!token) {
      return sendError(res, 401, "Authentication required");
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      return sendError(res, 401, "Invalid authentication session");
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, "Invalid token");
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, "Forbidden for this role");
    }

    next();
  };
}
