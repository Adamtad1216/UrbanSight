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

function resolveRestoreConfig() {
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
  const mongorestorePath = process.env.MONGORESTORE_PATH || "mongorestore";

  return {
    dbName,
    user,
    password,
    authSource,
    mongoUri,
    mongorestorePath,
  };
}

function resolveBackupInputPath() {
  const userInputPath = process.argv[2];
  if (!userInputPath) {
    console.error("Usage: npm run restore -- <backup-folder-path>");
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(userInputPath)
    ? userInputPath
    : path.resolve(process.cwd(), userInputPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`[restore] Backup path not found: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
}

function runRestore() {
  const config = resolveRestoreConfig();
  const backupPath = resolveBackupInputPath();

  const args = ["--uri", config.mongoUri, "--drop", backupPath];

  if (config.user && config.password) {
    args.push("--username", config.user);
    args.push("--password", config.password);
    args.push("--authenticationDatabase", config.authSource);
  }

  const commandString = `${config.mongorestorePath} ${args
    .map((value) => (value.includes(" ") ? `\"${value}\"` : value))
    .join(" ")}`;

  console.log(`[restore] Restoring MongoDB from ${backupPath}`);
  console.log(`[restore] Command: ${commandString}`);

  const child = spawn(config.mongorestorePath, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("error", (error) => {
    console.error(`[restore] Failed to start mongorestore: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log("[restore] Restore completed successfully");
      process.exit(0);
    }

    console.error(`[restore] Restore failed with exit code ${code}`);
    process.exit(code || 1);
  });
}

runRestore();
