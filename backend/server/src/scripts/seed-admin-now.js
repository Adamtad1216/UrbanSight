import { connectDB } from "../config/db.js";
import { seedAdminFromEnv } from "../utils/seed.js";

async function run() {
  await connectDB();

  const result = await seedAdminFromEnv({ skipProductionGuard: true });

  if (result.skipped && result.reason === "missing_env") {
    console.error(
      "Seed skipped: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.",
    );
    process.exit(1);
  }

  if (result.skipped && result.reason === "production") {
    console.error("Seed skipped in production environment.");
    process.exit(1);
  }

  if (result.created) {
    console.log(`Admin created: ${result.user.email} (${result.user.role})`);
  } else {
    console.log(
      `Admin already exists: ${result.user.email} (${result.user.role})`,
    );
  }

  process.exit(0);
}

run().catch((error) => {
  console.error("Admin seeding failed:", error.message);
  process.exit(1);
});
