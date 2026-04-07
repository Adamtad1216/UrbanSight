import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt) {
  const exponential =
    env.mongoRetryInitialDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponential, env.mongoRetryMaxDelayMs);
}

function buildLocalMongoUri() {
  const encodedUser = encodeURIComponent(env.mongoDbUser || "");
  const encodedPassword = encodeURIComponent(env.mongoDbPassword || "");
  const hasCredentials = Boolean(encodedUser && encodedPassword);

  const authPart = hasCredentials ? `${encodedUser}:${encodedPassword}@` : "";
  const queryParams = new URLSearchParams();

  if (hasCredentials) {
    queryParams.set("authSource", env.mongoAuthSource || "admin");
  }

  const queryString = queryParams.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return `mongodb://${authPart}${env.mongoHost}:${env.mongoPort}/${env.dbName}${suffix}`;
}

export function resolveMongoUri() {
  const localUri = env.localMongoUri || buildLocalMongoUri();
  const atlasUri = env.mongoAtlasUri || env.mongoUri;

  if (env.nodeEnv === "production") {
    if (atlasUri) {
      return atlasUri;
    }

    throw new Error(
      "Production MongoDB requires MONGO_ATLAS_URI (or MONGO_URI pointing to Atlas)",
    );
  }

  if (env.dbMode === "atlas") {
    if (atlasUri) {
      return atlasUri;
    }

    return env.mongoUri || localUri;
  }

  if (env.dbMode === "local") {
    return localUri;
  }

  if (env.dbMode === "auto" && atlasUri) {
    return atlasUri;
  }

  if (env.mongoUri) {
    return env.mongoUri;
  }

  return localUri;
}

function getConnectionOptions() {
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);

  return {
    dbName: env.dbName,
    maxPoolSize: env.mongoMaxPoolSize,
    minPoolSize: env.mongoMinPoolSize,
    maxIdleTimeMS: env.mongoMaxIdleTimeMs,
    connectTimeoutMS: env.mongoConnectTimeoutMs,
    socketTimeoutMS: env.mongoSocketTimeoutMs,
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
    family: 4,
    autoIndex: env.nodeEnv !== "production",
  };
}

async function attemptConnection(uri) {
  await mongoose.connect(uri, getConnectionOptions());
}

export async function connectDB() {
  const primaryUri = resolveMongoUri();
  const fallbackUri = env.localMongoUri;

  for (let attempt = 1; attempt <= env.mongoRetryAttempts; attempt += 1) {
    try {
      await attemptConnection(primaryUri);

      logger.info("MongoDB connected", {
        mode: env.dbMode,
        dbName: mongoose.connection.name,
        host: mongoose.connection.host,
      });

      return;
    } catch (primaryError) {
      const canTryFallback =
        Boolean(fallbackUri) &&
        fallbackUri !== primaryUri &&
        env.dbMode !== "atlas" &&
        env.nodeEnv !== "production";

      if (canTryFallback) {
        try {
          await attemptConnection(fallbackUri);
          logger.warn(
            "Primary MongoDB connection failed; using fallback local MongoDB",
            {
              attempt,
              error: primaryError?.message,
            },
          );
          return;
        } catch {
          // Keep original error context and continue retry loop.
        }
      }

      const isLastAttempt = attempt >= env.mongoRetryAttempts;
      if (isLastAttempt) {
        logger.error("MongoDB connection failed after retries", {
          attempts: env.mongoRetryAttempts,
          error: primaryError?.message,
        });
        throw primaryError;
      }

      const delayMs = backoffDelay(attempt);
      logger.warn("MongoDB connection attempt failed; retrying", {
        attempt,
        retryInMs: delayMs,
        error: primaryError?.message,
      });

      await sleep(delayMs);
    }
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function verifyDatabaseHealth() {
  if (!isDatabaseConnected()) {
    return {
      ok: false,
      state: mongoose.connection.readyState,
      message: "Database not connected",
    };
  }

  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    return {
      ok: true,
      state: mongoose.connection.readyState,
      message: "Database reachable",
    };
  } catch (error) {
    return {
      ok: false,
      state: mongoose.connection.readyState,
      message: error?.message || "Database ping failed",
    };
  }
}

export async function ensureIndexes() {
  const models = Object.values(mongoose.models);
  for (const model of models) {
    await model.syncIndexes();
  }
}

export async function closeDBConnection() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.close();
}
