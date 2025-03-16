import dotenv from "dotenv";
import path from "path";
import { ActivityType } from "../types/worker";
import ms from "ms";

// Load environment variables
dotenv.config();

type Config = {
  env: string;
  port: number;
  mongodb: {
    uri: string;
  };
  encryption: {
    key: string;
    algorithm: string;
  };
  logging: {
    level: string;
    directory: string;
  };
  discord: {
    defaultSettings: {
      autoReconnect: boolean;
      statusUpdateInterval: number;
      activityTypes: ActivityType[];
    };
  };
  api: {
    rateLimits: {
      windowMs: number;
      max: number;
    };
    accountCreation: {
      windowMs: number;
      max: number;
    };
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: ms.StringValue;
    refreshExpiresIn: ms.StringValue;
  };
  security: {
    maxLoginAttempts: number;
    lockoutTime: number;
    passwordResetExpires: number;
  };
};

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
  jwt: {
    secret: process.env.JWT_SECRET || "development-jwt-secret-key-change-in-production",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
    lockoutTime: parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || "15", 10), // in minutes
    passwordResetExpires: parseInt(process.env.PASSWORD_RESET_EXPIRES || "1", 10), // in hours
  },
} as Config;

export default config;
