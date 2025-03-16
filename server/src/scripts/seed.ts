import mongoose from "mongoose";
import { User } from "../models/User";
import { DiscordAccount } from "../models/DiscordAccount";
import { Friend } from "../models/Friend";
import { ActivityHistory } from "../models/ActivityHistory";
import { ContentHistory } from "../models/ContentHistory";
import { SystemMetrics } from "../models/SystemMetrics";
import config from "../config";
import logger from "../utils/logger";
import { seedPermissions } from "../models/Permission";
import { seedRoles } from "../models/Role";

// Admin account configuration
const ADMIN_CONFIG = {
  EMAIL: "admin@example.com",
  PASSWORD: "admin123",
  SETUP_COMPLETED: true,
  THEME: "dark",
};

// Application defaults
const DEFAULT_CONFIG = {
  CLEAR_EXISTING_DATA: false, // Set to true to reset the database on seed
  CREATE_DEFAULT_ROLES: true,
};

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info("Connected to MongoDB");

    // Clear existing data if configured
    if (DEFAULT_CONFIG.CLEAR_EXISTING_DATA) {
      logger.info("Clearing existing data...");
      await Promise.all([
        User.deleteMany({}),
        DiscordAccount.deleteMany({}),
        Friend.deleteMany({}),
        ActivityHistory.deleteMany({}),
        ContentHistory.deleteMany({}),
        SystemMetrics.deleteMany({}),
      ]);
      logger.info("Cleared existing data");
    }

    // Seed permissions and roles
    logger.info("Seeding permissions and roles...");
    await seedPermissions();
    const roleIds = await seedRoles();
    logger.info("Seeded permissions and roles successfully");

    // Create admin user
    await createAdminUser(roleIds);

    logger.info("Database seeding completed successfully");
  } catch (error) {
    logger.error("Error seeding database:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

// Create admin user
async function createAdminUser(roleIds: Map<string, mongoose.Types.ObjectId>) {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_CONFIG.EMAIL });

    if (existingAdmin) {
      logger.info("Admin user already exists, skipping creation");
      return;
    }

    // Create admin user
    const admin = await User.create({
      email: ADMIN_CONFIG.EMAIL,
      passwordHash: ADMIN_CONFIG.PASSWORD,
      setupCompleted: ADMIN_CONFIG.SETUP_COMPLETED,
      settings: {
        theme: ADMIN_CONFIG.THEME,
        notifications: {
          enabled: true,
          categories: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
        },
      },
    });

    // Assign admin role to user
    if (roleIds.has("ADMIN")) {
      const adminRoleId = roleIds.get("ADMIN");
      if (adminRoleId) {
        admin.roles = [adminRoleId];
        await admin.save();
        logger.info(`Created admin user with ID: ${admin._id}`);
      }
    } else {
      logger.warn("ADMIN role not found, admin user created without role assignment");
    }
  } catch (error) {
    logger.error("Failed to create admin user:", error);
  }
}

// Connect to MongoDB and seed the database
seedDatabase().catch(error => {
  logger.error("Failed to seed database:", error);
  process.exit(1);
});
