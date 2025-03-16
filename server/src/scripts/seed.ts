import mongoose, { Types } from "mongoose";
import { User } from "../models/User";
import { DiscordAccount } from "../models/DiscordAccount";
import { Friend } from "../models/Friend";
import { ActivityHistory } from "../models/ActivityHistory";
import { ContentHistory } from "../models/ContentHistory";
import { SystemMetrics } from "../models/SystemMetrics";
import { encryptToken } from "../utils/encryption";
import { ContentService } from "../services/ContentService";
import config from "../config";
import logger from "../utils/logger";
import { seedPermissions } from "../models/Permission";
import { seedRoles } from "../models/Role";
import bcrypt from "bcrypt";

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info("Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      DiscordAccount.deleteMany({}),
      Friend.deleteMany({}),
      ActivityHistory.deleteMany({}),
      ContentHistory.deleteMany({}),
      SystemMetrics.deleteMany({}),
    ]);
    logger.info("Cleared existing data");

    // Seed permissions and roles first
    logger.info("Seeding permissions and roles...");
    await seedPermissions();
    const roleIds = await seedRoles();
    logger.info("Seeded permissions and roles successfully");

    // Create test user
    const user = await User.create({
      email: "test@example.com",
      passwordHash: "placeholder-for-phase-2", // Will be properly hashed in Phase 2
      setupCompleted: true,
      settings: {
        theme: "light",
        notifications: {
          enabled: true,
          categories: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
        },
      },
    });

    // Assign roles to user with proper type checking
    if (roleIds.has("USER")) {
      const userRoleId = roleIds.get("USER");
      if (userRoleId) {
        user.roles = [userRoleId];
        await user.save();
      }
    }

    logger.info("Created test user");

    // Create test Discord account
    const account = await DiscordAccount.create({
      userId: user._id,
      name: "Test Discord Account",
      token: encryptToken("test-discord-token"),
      isActive: true,
      settings: {
        autoReconnect: true,
        statusUpdateInterval: 60000,
        activityTypes: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
      },
      status: {
        isConnected: false,
        lastConnection: null,
        lastDisconnection: null,
        currentActivity: null,
      },
      metrics: {
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        uptime: 0,
      },
    });
    logger.info("Created test Discord account");

    // Create test friends with various activities
    const friends = await Friend.create([
      {
        discordAccountId: account._id,
        userId: "123456789",
        username: "GamerFriend",
        lastActivity: {
          type: "GAME",
          gameName: "Minecraft",
          timestamp: new Date(),
        },
        contentReceived: 0,
        lastContentTime: null,
        contentPreferences: {
          enabledTypes: ["GAME", "STREAMING"],
          blacklist: [],
          timeRestrictions: {
            startHour: 9,
            endHour: 23,
          },
        },
      },
      {
        discordAccountId: account._id,
        userId: "987654321",
        username: "MusicLover",
        lastActivity: {
          type: "MUSIC",
          artistName: "Test Artist",
          songName: "Test Song",
          timestamp: new Date(),
        },
        contentReceived: 0,
        lastContentTime: null,
        contentPreferences: {
          enabledTypes: ["MUSIC", "CUSTOM"],
          blacklist: [],
          timeRestrictions: {
            startHour: 10,
            endHour: 22,
          },
        },
      },
      {
        discordAccountId: account._id,
        userId: "456789123",
        username: "StreamerFriend",
        lastActivity: {
          type: "STREAMING",
          streamTitle: "Playing Valorant",
          platform: "Twitch",
          timestamp: new Date(),
        },
        contentReceived: 0,
        lastContentTime: null,
        contentPreferences: {
          enabledTypes: ["STREAMING", "GAME"],
          blacklist: [],
          timeRestrictions: {
            startHour: 12,
            endHour: 24,
          },
        },
      },
      {
        discordAccountId: account._id,
        userId: "789123456",
        username: "NetflixEnthusiast",
        lastActivity: {
          type: "WATCHING",
          showName: "Stranger Things",
          platform: "Netflix",
          timestamp: new Date(),
        },
        contentReceived: 0,
        lastContentTime: null,
        contentPreferences: {
          enabledTypes: ["WATCHING", "CUSTOM"],
          blacklist: [],
          timeRestrictions: {
            startHour: 18,
            endHour: 2, // Next day
          },
        },
      },
      {
        discordAccountId: account._id,
        userId: "321654987",
        username: "CompetitivePro",
        lastActivity: {
          type: "COMPETING",
          tournamentName: "ESL Tournament",
          game: "CS:GO",
          timestamp: new Date(),
        },
        contentReceived: 0,
        lastContentTime: null,
        contentPreferences: {
          enabledTypes: ["COMPETING", "GAME", "STREAMING"],
          blacklist: [],
          timeRestrictions: {
            startHour: 8,
            endHour: 23,
          },
        },
      },
    ]);
    logger.info("Created test friends");

    // Create test activity history
    await ActivityHistory.create([
      {
        friendId: friends[0]._id,
        discordAccountId: account._id,
        type: "GAME",
        details: {
          gameName: "Minecraft",
        },
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(),
      },
      {
        friendId: friends[1]._id,
        discordAccountId: account._id,
        type: "MUSIC",
        details: {
          artistName: "Test Artist",
          songName: "Test Song",
          albumName: "Test Album",
          playerName: "Spotify",
        },
        startTime: new Date(Date.now() - 1800000), // 30 minutes ago
        endTime: new Date(),
      },
      {
        friendId: friends[2]._id,
        discordAccountId: account._id,
        type: "STREAMING",
        details: {
          platform: "Twitch",
          streamTitle: "Playing Valorant",
          url: "https://twitch.tv/streamerfriend",
        },
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        endTime: new Date(),
      },
      {
        friendId: friends[3]._id,
        discordAccountId: account._id,
        type: "WATCHING",
        details: {
          showName: "Stranger Things",
          platform: "Netflix",
          episode: "S04E01",
        },
        startTime: new Date(Date.now() - 5400000), // 1.5 hours ago
        endTime: new Date(),
      },
      {
        friendId: friends[4]._id,
        discordAccountId: account._id,
        type: "COMPETING",
        details: {
          tournamentName: "ESL Tournament",
          game: "CS:GO",
          rank: "Global Elite",
        },
        startTime: new Date(Date.now() - 9000000), // 2.5 hours ago
        endTime: new Date(),
      },
    ]);
    logger.info("Created test activity history");

    // Create test content history
    const contentService = ContentService.getInstance();

    // Search and store content for each friend based on their activities
    await Promise.all(
      friends.map(async friend => {
        const activity = friend.lastActivity;
        if (!activity) return;

        // Get search query based on activity type
        let searchQuery = "";
        switch (activity.type) {
          case "GAME":
            searchQuery = activity.gameName;
            break;
          case "MUSIC":
            searchQuery = `${activity.artistName} ${activity.songName || ""}`.trim();
            break;
          case "STREAMING":
            searchQuery = activity.streamTitle;
            break;
          case "WATCHING":
            searchQuery = activity.showName;
            break;
          case "COMPETING":
            searchQuery = `${activity.tournamentName} ${activity.game}`.trim();
            break;
          case "CUSTOM":
            searchQuery = activity.name;
            break;
          default:
            return; // Skip if no valid activity type
        }

        if (!searchQuery) return;

        // Search for content based on activity
        const content = await contentService.searchContent({
          type: activity.type,
          query: searchQuery,
          count: 1,
          filters: {
            excludeKeywords: ["nsfw", "offensive"],
          },
        });

        if (content.length > 0) {
          await contentService.storeContentHistory(
            account._id,
            friend._id,
            content,
            activity.type,
            searchQuery,
          );
        }
      }),
    );
    logger.info("Created test content history");

    // Create test system metrics
    await SystemMetrics.create({
      timestamp: new Date(),
      cpuUsage: 25.5,
      memoryUsage: {
        total: 16384,
        used: 8192,
        free: 8192,
      },
      threadCount: 5,
      activeClients: 1,
      activeUsers: 1,
      requestsPerMinute: 60,
      errorRate: 0,
    });
    logger.info("Created test system metrics");

    // Create admin user with admin role
    await createAdminUser(roleIds.has("ADMIN") ? roleIds.get("ADMIN") : undefined);

    // Also create a regular user
    await createRegularUser(roleIds.has("USER") ? roleIds.get("USER") : undefined);

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
async function createAdminUser(adminRoleId?: Types.ObjectId) {
  try {
    // Check if admin user already exists
    const User = mongoose.model("User");
    const existingAdmin = await User.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      logger.info("Admin user already exists, skipping creation");
      return;
    }

    // Create admin user with hashed password
    const passwordHash = await bcrypt.hash("adminPassword123", 10);
    const admin = await User.create({
      email: "admin@example.com",
      passwordHash,
    });

    logger.info(`Created admin user with ID: ${admin._id}`);

    // Assign admin role to user
    if (adminRoleId) {
      admin.roles = [adminRoleId];
      await admin.save();
    }
  } catch (error) {
    logger.error("Failed to create admin user:", error);
  }
}

// Create a regular user
async function createRegularUser(userRoleId?: Types.ObjectId) {
  try {
    // Check if user already exists
    const User = mongoose.model("User");
    const existingUser = await User.findOne({ email: "user@example.com" });

    if (existingUser) {
      logger.info("Regular user already exists, skipping creation");
      return;
    }

    // Create regular user with hashed password
    const passwordHash = await bcrypt.hash("userPassword123", 10);
    const user = await User.create({
      email: "user@example.com",
      passwordHash,
    });

    logger.info(`Created regular user with ID: ${user._id}`);

    // Assign user role
    if (userRoleId) {
      user.roles = [userRoleId];
      await user.save();
    }
  } catch (error) {
    logger.error("Failed to create regular user:", error);
  }
}

// Connect to MongoDB and seed the database
seedDatabase().catch(error => {
  logger.error("Failed to seed database:", error);
  process.exit(1);
});
