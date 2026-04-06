import app from "./app.js";
import { closeDBConnection, connectDB, ensureIndexes } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { seedDefaultStaffUsers } from "./utils/seed.js";

let server;
let shuttingDown = false;

function summarizeIndexSyncError(error) {
  const message = error?.message || String(error);

  if (message.includes("E11000") && message.includes("index: phone_1")) {
    return "Duplicate phone values exist in users collection. Resolve duplicates before enabling strict startup index sync.";
  }

  return message;
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.warn("Shutdown signal received", { signal });

  try {
    if (server && server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    await closeDBConnection();
    logger.info("Server shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      error: error?.stack || error?.message || error,
    });
    process.exit(1);
  }
}

async function bootstrap() {
  await connectDB();
  if (env.syncIndexesOnStartup) {
    try {
      await ensureIndexes();
    } catch (error) {
      logger.warn("Index synchronization failed", {
        error: summarizeIndexSyncError(error),
      });

      if (env.nodeEnv === "production") {
        throw error;
      }
    }
  } else {
    logger.info("Index synchronization skipped on startup", {
      reason:
        "Set SYNC_INDEXES_ON_STARTUP=true to enforce model indexes at boot",
    });
  }
  await seedDefaultStaffUsers();

  server = app.listen(env.port, () => {
    logger.info("UrbanSight API started", {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });
  });

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      logger.warn("Server port already in use", {
        port: env.port,
        hint: "Stop the other backend process or change PORT",
      });
      shutdown("EADDRINUSE");
      return;
    }

    logger.error("HTTP server error", {
      error: error?.stack || error?.message || error,
    });
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", {
    error: error?.stack || error?.message || error,
  });
  process.exit(1);
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.stack : reason,
  });
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error?.stack || error?.message || error,
  });
  shutdown("uncaughtException");
});
