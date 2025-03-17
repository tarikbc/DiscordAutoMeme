import app from "./app";
import config from "./config";
import logger, { initSocketTransport } from "./utils/logger";
import { DiscordAccountService } from "./services/DiscordAccountService";
import { createServer } from "http";
import socketService from "./services/SocketService";

const startServer = async () => {
  try {
    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    socketService.initialize(httpServer);

    // Add Socket.io transport to Winston logger
    initSocketTransport();

    // Start server with httpServer instead of app
    const server = httpServer.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.env} mode`);
      logger.info(`Socket.io server is initialized and ready for connections`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      logger.info("Received shutdown signal. Starting graceful shutdown...");

      try {
        // Stop all Discord clients
        const accountService = DiscordAccountService.getInstance();
        await accountService.stopAllWorkers();

        // Shutdown Socket.io
        socketService.shutdown();

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
