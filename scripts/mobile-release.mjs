import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const portal = process.argv[2];

if (!portal || !["citizen", "backoffice"].includes(portal)) {
  console.error("Usage: node scripts/mobile-release.mjs <citizen|backoffice>");
  process.exit(1);
}

const root = process.cwd();
const androidDir = path.join(root, "android");
const outputDir = path.join(root, "apk-output");
const srcDir = path.join(root, "frontend", "dist", portal);
const mobileDir = path.join(root, "frontend", "dist-mobile");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      cwd: options.cwd || root,
      env: { ...process.env, ...(options.env || {}) },
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

function findLocalJavaHome() {
  const jdkRoot = path.join(root, ".tools", "jdk21");
  if (!fs.existsSync(jdkRoot)) return null;
  const dirs = fs
    .readdirSync(jdkRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory());
  if (!dirs.length) return null;
  return path.join(jdkRoot, dirs[0].name);
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

function ensureLocalProperties() {
  const sdkDir = path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
  if (!sdkDir || !fs.existsSync(sdkDir)) {
    throw new Error("Android SDK not found at %LOCALAPPDATA%\\Android\\Sdk");
  }

  const localPropsPath = path.join(androidDir, "local.properties");
  const escaped = sdkDir.replace(/\\/g, "\\\\");
  fs.writeFileSync(localPropsPath, `sdk.dir=${escaped}\n`, "utf8");
}

function copyDir(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function copyArtifact(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing expected build artifact: ${source}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

async function main() {
  const javaHome = findLocalJavaHome();
  if (!javaHome) {
    throw new Error(
      "Local JDK 21 not found in .tools/jdk21. Reinstall local JDK before release build.",
    );
  }

  const mobileApiBaseUrl =
    process.env.VITE_API_BASE_URL || detectLanApiBaseUrl();

  if (!mobileApiBaseUrl) {
    throw new Error(
      "Set VITE_API_BASE_URL before release build so mobile app and web app use the same backend.",
    );
  }

  const env = {
    JAVA_HOME: javaHome,
    Path: `${path.join(javaHome, "bin")};${process.env.Path || ""}`,
    VITE_API_BASE_URL: mobileApiBaseUrl,
  };

  console.log(`[mobile-release] Using API base URL: ${mobileApiBaseUrl}`);

  ensureLocalProperties();
  await run("node", ["scripts/patch-capacitor-android.mjs"], { env });
  await run("npm", ["run", `build:${portal}`], { env });

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Expected build output missing: ${srcDir}`);
  }

  copyDir(srcDir, mobileDir);
  await run("npx", ["cap", "sync", "android"], { env });
  await run(
    "gradlew.bat",
    ["clean", "assembleRelease", "bundleRelease", "--console=plain"],
    {
      cwd: androidDir,
      env,
    },
  );

  fs.mkdirSync(outputDir, { recursive: true });

  const releaseApk = path.join(
    androidDir,
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "app-release.apk",
  );
  const releaseAab = path.join(
    androidDir,
    "app",
    "build",
    "outputs",
    "bundle",
    "release",
    "app-release.aab",
  );

  copyArtifact(
    releaseApk,
    path.join(outputDir, `urbansight-${portal}-release.apk`),
  );
  copyArtifact(
    releaseAab,
    path.join(outputDir, `urbansight-${portal}-release.aab`),
  );

  console.log(
    `[mobile-release] Created release APK/AAB for ${portal} portal in apk-output.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
