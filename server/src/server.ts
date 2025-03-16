import app from "./app";
import config from "./config";
import logger from "./utils/logger";
import { DiscordAccountService } from "./services/DiscordAccountService";

const startServer = async () => {
  try {
    const server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.env} mode`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      logger.info("Received shutdown signal. Starting graceful shutdown...");

      try {
        // Stop all Discord clients
        const accountService = DiscordAccountService.getInstance();
        await accountService.stopAllWorkers();

        // Close server
        server.close(() => {
          logger.info("Server closed successfully");
          process.exit(0);
        });
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    // Start active Discord clients
    const accountService = DiscordAccountService.getInstance();
    await accountService.startAllWorkers();
    logger.info("Started all active Discord clients");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
