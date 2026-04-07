import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const backendRootDir = path.resolve(currentDir, "../../..");
const workspaceRootDir = path.resolve(backendRootDir, "..");
const backendEnvPath = path.join(backendRootDir, ".env");
const rootEnvPath = path.join(workspaceRootDir, ".env");

dotenv.config({
  path: fs.existsSync(backendEnvPath) ? backendEnvPath : rootEnvPath,
  quiet: true,
});

const defaultClientOrigins = "http://localhost:5173,http://localhost:3000";
const configuredClientOrigins =
  process.env.CLIENT_ORIGIN ||
  process.env.CLIENT_ORIGINS ||
  defaultClientOrigins;
const clientOrigins = configuredClientOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeDbMode(value, fallbackMode) {
  const mode = String(value || fallbackMode || "local")
    .trim()
    .toLowerCase();
  if (["local", "atlas", "auto"].includes(mode)) {
    return mode;
  }

  return "local";
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "",
  mongoAtlasUri: process.env.MONGO_ATLAS_URI || "",
  dbMode: normalizeDbMode(
    process.env.DB_MODE,
    (process.env.NODE_ENV || "development") === "production"
      ? "atlas"
      : "local",
  ),
  dbName: process.env.DB_NAME || "urbansight",
  mongoHost: process.env.MONGO_HOST || "127.0.0.1",
  mongoPort: parseInteger(process.env.MONGO_PORT, 27017),
  mongoDbUser: process.env.MONGO_DB_USER || "",
  mongoDbPassword: process.env.MONGO_DB_PASSWORD || "",
  mongoAuthSource: process.env.MONGO_AUTH_SOURCE || "admin",
  localMongoUri:
    process.env.MONGO_LOCAL_URI || "mongodb://127.0.0.1:27017/urbansight",
  mongoRetryAttempts: parseInteger(process.env.MONGO_RETRY_ATTEMPTS, 8),
  mongoRetryInitialDelayMs: parseInteger(
    process.env.MONGO_RETRY_INITIAL_DELAY_MS,
    1000,
  ),
  mongoRetryMaxDelayMs: parseInteger(
    process.env.MONGO_RETRY_MAX_DELAY_MS,
    30000,
  ),
  mongoMaxPoolSize: parseInteger(process.env.MONGO_MAX_POOL_SIZE, 50),
  mongoMinPoolSize: parseInteger(process.env.MONGO_MIN_POOL_SIZE, 5),
  mongoMaxIdleTimeMs: parseInteger(process.env.MONGO_MAX_IDLE_TIME_MS, 300000),
  mongoSocketTimeoutMs: parseInteger(
    process.env.MONGO_SOCKET_TIMEOUT_MS,
    30000,
  ),
  mongoConnectTimeoutMs: parseInteger(
    process.env.MONGO_CONNECT_TIMEOUT_MS,
    10000,
  ),
  mongoServerSelectionTimeoutMs: parseInteger(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    5000,
  ),
  syncIndexesOnStartup: parseBoolean(
    process.env.SYNC_INDEXES_ON_STARTUP,
    (process.env.NODE_ENV || "development") === "production",
  ),
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientOrigin: clientOrigins[0] || "http://localhost:5173",
  clientOrigins,
  cloudinaryCloudName:
    process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || "",
  cloudinaryApiKey:
    process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || "",
  cloudinaryApiSecret:
    process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "UrbanSight <no-reply@urbansight.local>",
  oauthGoogleClientId: process.env.OAUTH_GOOGLE_CLIENT_ID || "",
  oauthGoogleClientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || "",
  oauthGoogleCallbackUrl: process.env.OAUTH_GOOGLE_CALLBACK_URL || "",
  oauthCitizenSuccessUrl:
    process.env.OAUTH_CITIZEN_SUCCESS_URL ||
    `${clientOrigins[0] || "http://localhost:5173"}/citizen/dashboard`,
  oauthCitizenFailureUrl:
    process.env.OAUTH_CITIZEN_FAILURE_URL ||
    `${clientOrigins[0] || "http://localhost:5173"}/login?oauthError=1`,
  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || "Admin User",
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || "",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "",
  SEED_ADMIN_PHONE: process.env.SEED_ADMIN_PHONE || "+251911111111",
  backupDir:
    process.env.BACKUP_DIR || path.resolve(workspaceRootDir, "backups"),
  mongodumpPath: process.env.MONGODUMP_PATH || "mongodump",
  mongorestorePath: process.env.MONGORESTORE_PATH || "mongorestore",
};
