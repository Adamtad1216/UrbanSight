import fs from "fs";
import path from "path";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";

const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const loggerFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.json(),
);

const loggerTransports = [
  new transports.Console({
    format:
      env.nodeEnv === "production"
        ? loggerFormat
        : format.combine(format.colorize(), format.simple()),
  }),
  new transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
  }),
  new transports.File({ filename: path.join(logsDir, "combined.log") }),
];

export const logger = createLogger({
  level: env.logLevel,
  format: loggerFormat,
  transports: loggerTransports,
  exitOnError: false,
});
