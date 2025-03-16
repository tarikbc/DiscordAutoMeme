import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import logger from "./utils/logger";
import { DiscordAccountService } from "./services/DiscordAccountService";
import apiRoutes from "./api/routes";

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  morgan("combined", {
    stream: { write: message => logger.info(message.trim()) },
  }),
);

// Routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Initialize database and worker manager
async function initialize() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/discord-auto-meme",
    );
    logger.info("Connected to MongoDB");

    const discordAccountService = DiscordAccountService.getInstance();
    await discordAccountService.startAllWorkers();
    logger.info("Started all Discord account workers");

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received. Starting graceful shutdown...");
      await discordAccountService.stopAllWorkers();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received. Starting graceful shutdown...");
      await discordAccountService.stopAllWorkers();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    process.exit(1);
  }
}

initialize();

export default app;
