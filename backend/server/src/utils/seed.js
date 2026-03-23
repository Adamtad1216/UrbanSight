import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { roles } from "./constants.js";

function buildSeedUsers() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    return [];
  }

  return [
    {
      name: process.env.SEED_ADMIN_NAME || "System Admin",
      email,
      password,
      phone: process.env.SEED_ADMIN_PHONE || "+251911111111",
      role: roles.ADMIN,
      firstLogin: false,
    },
  ];
}

async function createStaffUserIfMissing(staff) {
  const existingUser = await User.findOne({ email: staff.email });
  if (existingUser) {
    return;
  }

  await User.create(staff);
}

export async function seedDefaultStaffUsers() {
  if (env.nodeEnv === "production") {
    return;
  }

  const seedDataUsers = buildSeedUsers();
  for (const staff of seedDataUsers) {
    await createStaffUserIfMissing(staff);
  }
}
