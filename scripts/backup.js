import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const workspaceRootDir = path.resolve(currentDir, "..");
const backendEnvPath = path.join(workspaceRootDir, "backend", ".env");
const rootEnvPath = path.join(workspaceRootDir, ".env");

dotenv.config({
  path: fs.existsSync(backendEnvPath) ? backendEnvPath : rootEnvPath,
  quiet: true,
});

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveBackupConfig() {
  const dbName = process.env.DB_NAME || "urbansight";
  const host = process.env.MONGO_HOST || "127.0.0.1";
  const port = parseInteger(process.env.MONGO_PORT, 27017);
  const user = process.env.MONGO_DB_USER || "";
  const password = process.env.MONGO_DB_PASSWORD || "";
  const authSource = process.env.MONGO_AUTH_SOURCE || "admin";
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGO_LOCAL_URI ||
    `mongodb://${host}:${port}/${dbName}`;
  const backupDir =
    process.env.BACKUP_DIR || path.resolve(workspaceRootDir, "backups");
  const mongodumpPath = process.env.MONGODUMP_PATH || "mongodump";

  return {
    dbName,
    user,
    password,
    authSource,
    mongoUri,
    backupDir,
    mongodumpPath,
  };
}

function buildTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

function runBackup() {
  const config = resolveBackupConfig();
  const backupPath = path.join(
    config.backupDir,
    `${config.dbName}-${buildTimestamp()}`,
  );
  fs.mkdirSync(backupPath, { recursive: true });

  const args = ["--uri", config.mongoUri, "--out", backupPath];

  if (config.user && config.password) {
    args.push("--username", config.user);
    args.push("--password", config.password);
    args.push("--authenticationDatabase", config.authSource);
  }

  const commandString = `${config.mongodumpPath} ${args
    .map((value) => (value.includes(" ") ? `\"${value}\"` : value))
    .join(" ")}`;

  console.log(`[backup] Starting MongoDB backup`);
  console.log(`[backup] Command: ${commandString}`);

  const child = spawn(config.mongodumpPath, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("error", (error) => {
    console.error(`[backup] Failed to start mongodump: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log(`[backup] Backup completed at ${backupPath}`);
      process.exit(0);
    }

    console.error(`[backup] Backup failed with exit code ${code}`);
    process.exit(code || 1);
  });
}

runBackup();
