import mongoose from "mongoose";
import logger from "./logger";

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/discord_auto_content";

  try {
    await mongoose.connect(mongoUri);
    logger.info("Successfully connected to MongoDB.");
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }

  mongoose.connection.on("error", error => {
    logger.error("MongoDB connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error);
      process.exit(1);
    }
  });
}
