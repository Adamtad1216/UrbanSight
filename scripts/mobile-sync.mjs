import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const portal = process.argv[2];
const watchMode = process.argv.includes("--watch");

if (!portal || !["citizen", "backoffice"].includes(portal)) {
  console.error(
    "Usage: node scripts/mobile-sync.mjs <citizen|backoffice> [--watch]",
  );
  process.exit(1);
}

const root = process.cwd();
const srcDir = path.join(root, "frontend", "dist", portal);
const mobileDir = path.join(root, "frontend", "dist-mobile");

function findLocalJavaHome() {
  const jdkRoot = path.join(root, ".tools", "jdk21");
  if (!fs.existsSync(jdkRoot)) return null;
  const dirs = fs
    .readdirSync(jdkRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory());
  if (!dirs.length) return null;
  return path.join(jdkRoot, dirs[0].name);
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...extraEnv },
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args.join(" ")} failed with code ${code}`),
        );
    });
  });
}

function detectLanApiBaseUrl() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return `http://${entry.address}:5000/api`;
      }
    }
  }
  return null;
}

function copyDir(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

async function syncOnce() {
  const javaHome = findLocalJavaHome();
  const mobileApiBaseUrl =
    process.env.VITE_API_BASE_URL || detectLanApiBaseUrl();

  if (!mobileApiBaseUrl) {
    throw new Error("Set VITE_API_BASE_URL before syncing mobile assets.");
  }

  await run("npm", ["run", `build:${portal}`], {
    VITE_API_BASE_URL: mobileApiBaseUrl,
  });

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Expected build output missing: ${srcDir}`);
  }

  copyDir(srcDir, mobileDir);

  const env = javaHome
    ? {
        JAVA_HOME: javaHome,
        Path: `${path.join(javaHome, "bin")};${process.env.Path || ""}`,
        VITE_API_BASE_URL: mobileApiBaseUrl,
      }
    : { VITE_API_BASE_URL: mobileApiBaseUrl };

  await run("npx", ["cap", "sync", "android"], env);
  console.log(
    `[mobile-sync] Synced ${portal} portal to Android assets using ${mobileApiBaseUrl}.`,
  );
}

if (!watchMode) {
  syncOnce().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
} else {
  const watchTarget = path.join(root, "frontend", "src");
  let timer = null;
  let running = false;
  let queued = false;

  const trigger = () => {
    if (running) {
      queued = true;
      return;
    }

    running = true;
    syncOnce()
      .catch((error) => console.error(`[mobile-sync] ${error.message}`))
      .finally(() => {
        running = false;
        if (queued) {
          queued = false;
          trigger();
        }
      });
  };

  console.log(
    `[mobile-sync] Watching ${watchTarget} for ${portal} portal changes...`,
  );
  trigger();

  fs.watch(watchTarget, { recursive: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => trigger(), 600);
  });
}
