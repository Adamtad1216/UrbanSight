import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { seedDefaultStaffUsers } from "./utils/seed.js";

async function bootstrap() {
  await connectDB();
  await seedDefaultStaffUsers();

  app.listen(env.port, () => {
    console.log(`UrbanSight API running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
