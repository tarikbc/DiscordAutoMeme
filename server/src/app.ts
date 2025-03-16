import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import logger from "./utils/logger";
import { DiscordAccountService } from "./services/DiscordAccountService";
import apiRoutes from "./api/routes";
import healthRouter from "./api/routes/health";
import swaggerSetup from "./api/swagger";
import { errorHandler } from "./api/middleware/errorHandler";
import { scheduleTokenCleanup } from "./jobs/tokenCleanup";
import { scheduleAlertMonitoring } from "./jobs/alertMonitor";
import mongoose from "mongoose";

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  morgan("combined", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }),
);

// Setup Swagger
swaggerSetup(app);

// Routes
app.use("/api", apiRoutes);
app.use("/health", healthRouter);

// Error handling middleware
app.use(errorHandler);

// Initialize database and worker manager
async function initialize() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/discord-auto-meme",
    );
    logger.info("Connected to MongoDB");

    // Start Discord account workers
    const discordAccountService = DiscordAccountService.getInstance();
    await discordAccountService.startAllWorkers();
    logger.info("Started all Discord account workers");

    // Schedule token cleanup job
    scheduleTokenCleanup();
    logger.info("Token cleanup job scheduled");

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received. Starting graceful shutdown...");
      await discordAccountService.stopAllWorkers();
      process.exit(0);
    });

    // Schedule alert monitoring job
    scheduleAlertMonitoring();
    logger.info("Alert monitoring job scheduled");

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
