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

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/urbansight",
  localMongoUri:
    process.env.MONGO_LOCAL_URI || "mongodb://127.0.0.1:27017/urbansight",
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
};
