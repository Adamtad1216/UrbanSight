import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { roles } from "./constants.js";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildSeedAdminFromEnv() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return {
    name: process.env.SEED_ADMIN_NAME || "System Admin",
    email: normalizeEmail(email),
    password,
    phone: process.env.SEED_ADMIN_PHONE || "+251911111111",
    role: roles.ADMIN,
    firstLogin: false,
  };
}

async function createUserIfMissing(userPayload) {
  const existingUser = await User.findOne({ email: userPayload.email });
  if (existingUser) {
    return { created: false, user: existingUser };
  }

  const createdUser = await User.create(userPayload);
  return { created: true, user: createdUser };
}

export async function seedAdminFromEnv({ skipProductionGuard = false } = {}) {
  if (!skipProductionGuard && env.nodeEnv === "production") {
    return { skipped: true, reason: "production" };
  }

  const seedAdmin = buildSeedAdminFromEnv();
  if (!seedAdmin) {
    return { skipped: true, reason: "missing_env" };
  }

  const result = await createUserIfMissing(seedAdmin);
  return {
    skipped: false,
    created: result.created,
    user: result.user,
  };
}

export async function seedDefaultStaffUsers() {
  await seedAdminFromEnv();
}
