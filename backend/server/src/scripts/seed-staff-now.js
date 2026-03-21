import { connectDB } from "../config/db.js";
import { seedDefaultStaffUsers } from "../utils/seed.js";
import { User } from "../models/User.js";

async function run() {
  await connectDB();
  await seedDefaultStaffUsers();

  const staffUsers = await User.find({ role: { $ne: "citizen" } })
    .select("email role")
    .sort({ role: 1, email: 1 })
    .lean();

  console.log(`Seeded non-citizen users: ${staffUsers.length}`);
  for (const user of staffUsers) {
    console.log(`${user.email} (${user.role})`);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
