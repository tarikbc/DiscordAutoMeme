import dotenv from "dotenv";
import path from "path";
import { ActivityType } from "../types/worker";

// Load environment variables
dotenv.config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/discord-auto-content",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || "default-dev-key-32-chars-exactly!",
    algorithm: "aes-256-gcm",
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    directory: process.env.LOG_DIR || path.join(__dirname, "../../logs"),
  },
  discord: {
    defaultSettings: {
      autoReconnect: true,
      statusUpdateInterval: 60000, // 1 minute
      activityTypes: [
        "GAME",
        "MUSIC",
        "STREAMING",
        "WATCHING",
        "CUSTOM",
        "COMPETING",
      ] as ActivityType[],
    },
  },
  api: {
    rateLimits: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    accountCreation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // limit each IP to 5 account creations per hour
    },
  },
} as const;

export default config;
