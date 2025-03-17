import winston from "winston";
import dotenv from "dotenv";
import SocketTransport from "./SocketTransport";
import path from "path";

dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "../../../logs/error.log"),
      level: "error",
    }),
    new winston.transports.File({ filename: path.join(__dirname, "../../../logs/combined.log") }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}

// Function to add socket transport (called after socket service is initialized)
export const addSocketTransport = (): void => {
  // Don't add it twice
  if (logger.transports.some(transport => transport instanceof SocketTransport)) {
    return;
  }

  logger.add(
    new SocketTransport({
      level: "info",
      bufferSize: 5, // Batch size before emitting
      flushInterval: 1000, // Emit at least every second
    }),
  );

  logger.info("Socket transport added to logger");
};

//Initialize the socket transport after the server starts
export const initSocketTransport = (): void => {
  const SocketTransport = require("./SocketTransport").default;

  // Don't add it twice
  if (logger.transports.some(transport => transport instanceof SocketTransport)) {
    return;
  }

  logger.add(
    new SocketTransport({
      level: "info",
      bufferSize: 5, // Batch size before emitting
      flushInterval: 1000, // Emit at least every second
    }),
  );

  logger.info("Socket transport added to logger");
};

export default logger;
