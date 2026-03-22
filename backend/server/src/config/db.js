import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  const primaryUri = env.mongoUri;
  const fallbackUri = env.localMongoUri;

  try {
    await mongoose.connect(primaryUri);
  } catch (primaryError) {
    if (!fallbackUri || fallbackUri === primaryUri) {
      throw primaryError;
    }

    if (env.nodeEnv !== "production") {
      console.warn(
        "Primary MongoDB connection failed. Falling back to local MongoDB.",
        primaryError.message,
      );
    }

    await mongoose.connect(fallbackUri);
  }
}
