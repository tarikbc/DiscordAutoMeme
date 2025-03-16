import { Types } from "mongoose";
import { DiscordAccount, IDiscordAccount } from "../models/DiscordAccount";
import { encryptToken } from "../utils/encryption";
import { WorkerManager } from "../workers/WorkerManager";
import logger from "../utils/logger";
import config from "../config";
import { User, IUser } from "../models/User";
import { Role } from "../models/Role";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  roleIds?: Types.ObjectId[];
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  settings?: Partial<IUser["settings"]>;
  setupCompleted?: boolean;
}

export class AccountService {
  private workerManager: WorkerManager;
  private static instance: AccountService;

  private constructor(workerManager: WorkerManager) {
    this.workerManager = workerManager;
  }

  public static getInstance(workerManager: WorkerManager): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService(workerManager);
    }
    return AccountService.instance;
  }

  /**
   * Create a new user account
   */
  async createUser(input: CreateUserInput): Promise<IUser> {
    try {
      // Check if email already exists
      const existingUser = await User.findOne({ email: input.email }).exec();
      if (existingUser) {
        throw new Error("Email already in use");
      }

      const user = await User.create({
        email: input.email,
        passwordHash: input.passwordHash,
        roles: input.roleIds || [],
        setupCompleted: false,
        discordAccountsCount: 0,
        settings: {
          theme: "light",
          notifications: {
            enabled: true,
            categories: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
          },
        },
        createdAt: new Date(),
        lastLogin: null,
      });

      logger.info(`Created new user account: ${user._id}`);
      return user;
    } catch (error) {
      logger.error("Error creating user account:", error);
      throw error;
    }
  }

  /**
   * Get a user by ID
   */
  getUserById(userId: Types.ObjectId): Promise<IUser | null> {
    return User.findById(userId).exec();
  }

  /**
   * Get a user by email
   */
  getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).exec();
  }

  /**
   * Update user account
   */
  async updateUser(userId: Types.ObjectId, input: UpdateUserInput): Promise<IUser | null> {
    try {
      // If email is being updated, check it's not already in use
      if (input.email) {
        const existingUser = await User.findOne({
          email: input.email,
          _id: { $ne: userId },
        }).exec();

        if (existingUser) {
          throw new Error("Email already in use");
        }
      }

      const update: any = { ...input };

      if (input.settings) {
        update.$set = { settings: input.settings };
      }

      const user = await User.findByIdAndUpdate(userId, update, {
        new: true,
      }).exec();

      if (user) {
        logger.info(`Updated user account: ${userId}`);
      }

      return user;
    } catch (error) {
      logger.error(`Error updating user account ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await User.findByIdAndDelete(userId).exec();

      if (result) {
        logger.info(`Deleted user account: ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error deleting user account ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin(userId: Types.ObjectId): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { lastLogin: new Date() },
      }).exec();

      logger.debug(`Updated last login for user: ${userId}`);
    } catch (error) {
      logger.error(`Error updating last login for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Mark user setup as completed
   */
  async completeSetup(userId: Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            setupCompleted: true,
            "settings.setupCompletedAt": new Date(),
          },
        },
        { new: true },
      ).exec();

      if (user) {
        logger.info(`Completed setup for user: ${userId}`);
      }

      return user;
    } catch (error) {
      logger.error(`Error completing setup for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(
    page = 1,
    limit = 10,
    filter?: { roleIds?: Types.ObjectId[]; setupCompleted?: boolean },
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<{ users: IUser[]; total: number }> {
    try {
      const query: any = {};

      if (filter?.roleIds) {
        query.roles = { $in: filter.roleIds };
      }

      if (filter?.setupCompleted !== undefined) {
        query.setupCompleted = filter.setupCompleted;
      }

      // Build sort object
      const sort: { [key: string]: 1 | -1 } = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      const [users, total] = await Promise.all([
        User.find(query)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort(sort)
          .exec(),
        User.countDocuments(query).exec(),
      ]);

      return { users, total };
    } catch (error) {
      logger.error("Error getting users:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<any> {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({
        lastLogin: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });
      const newUsers = await User.countDocuments({
        createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      return {
        totalUsers,
        activeUsers,
        newUsers,
      };
    } catch (error) {
      logger.error("Error getting user statistics:", error);
      throw error;
    }
  }

  /**
   * Assign roles to user (admin only)
   */
  async assignUserRoles(userId: Types.ObjectId, roleIds: Types.ObjectId[]): Promise<IUser | null> {
    try {
      // Validate roles
      const validRoles = await Role.find({
        _id: { $in: roleIds },
      });

      if (validRoles.length !== roleIds.length) {
        throw new Error("One or more role IDs are invalid");
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { roles: roleIds } },
        { new: true },
      ).exec();

      if (user) {
        logger.info(`Assigned roles for user ${userId}: ${roleIds.join(", ")}`);
      }

      return user;
    } catch (error) {
      logger.error(`Error assigning roles for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add Discord account to user
   */
  async addDiscordAccount(
    userId: Types.ObjectId,
    name: string,
    token: string,
  ): Promise<IUser | null> {
    try {
      const encryptedToken = encryptToken(token);

      // Create Discord account
      const discordAccount = await DiscordAccount.create({
        userId,
        name,
        token: encryptedToken,
        isActive: false,
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

      // Update user's Discord accounts count
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { discordAccountsCount: 1 } },
        { new: true },
      ).exec();

      logger.info(`Added Discord account ${discordAccount._id} to user ${userId}`);
      return user;
    } catch (error) {
      logger.error("Error adding Discord account:", error);
      throw error;
    }
  }

  /**
   * Remove Discord account from user
   */
  async removeDiscordAccount(
    userId: Types.ObjectId,
    discordAccountId: Types.ObjectId,
  ): Promise<IUser | null> {
    try {
      // Stop worker if account is active
      const discordAccount = await DiscordAccount.findById(discordAccountId).exec();
      if (discordAccount && discordAccount.isActive) {
        await this.workerManager.stopWorker(discordAccountId.toString());
      }

      // Delete Discord account
      await DiscordAccount.findByIdAndDelete(discordAccountId).exec();

      // Update user's Discord accounts count
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { discordAccountsCount: -1 } },
        { new: true },
      ).exec();

      logger.info(`Removed Discord account ${discordAccountId} from user ${userId}`);
      return user;
    } catch (error) {
      logger.error("Error removing Discord account:", error);
      throw error;
    }
  }

  /**
   * Get user's Discord accounts
   */
  getUserDiscordAccounts(userId: Types.ObjectId) {
    return DiscordAccount.find({ userId }).exec();
  }

  /**
   * Get total number of users
   */
  getUserCount(): Promise<number> {
    return User.countDocuments().exec();
  }

  /**
   * Get users with active Discord accounts
   */
  async getActiveUsers(): Promise<IUser[]> {
    const activeAccountUserIds = await DiscordAccount.distinct("userId", {
      isActive: true,
    }).exec();
    return User.find({ _id: { $in: activeAccountUserIds } }).exec();
  }

  /**
   * Create a new Discord account
   */
  async createAccount(
    userId: Types.ObjectId,
    name: string,
    token: string,
  ): Promise<IDiscordAccount> {
    try {
      const encryptedToken = encryptToken(token);

      const account = await DiscordAccount.create({
        userId,
        name,
        token: encryptedToken,
        isActive: false,
        settings: config.discord.defaultSettings,
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

      logger.info(`Created new Discord account: ${account._id}`);
      return account;
    } catch (error) {
      logger.error("Error creating Discord account:", error);
      throw error;
    }
  }

  /**
   * Get a Discord account by ID
   */
  getAccountById(accountId: Types.ObjectId): Promise<IDiscordAccount | null> {
    return DiscordAccount.findById(accountId).exec();
  }

  /**
   * Get all Discord accounts for a user
   */
  getAccountsByUserId(userId: Types.ObjectId): Promise<IDiscordAccount[]> {
    return DiscordAccount.find({ userId }).exec();
  }

  /**
   * Update account settings
   */
  async updateAccountSettings(
    accountId: Types.ObjectId,
    settings: Partial<IDiscordAccount["settings"]>,
  ): Promise<IDiscordAccount | null> {
    const account = await DiscordAccount.findByIdAndUpdate(
      accountId,
      { $set: { settings } },
      { new: true },
    ).exec();

    if (account && account.isActive) {
      await this.workerManager.updateWorkerSettings(account, {
        ...account.settings,
        ...settings,
      });
    }

    return account;
  }

  /**
   * Update account status
   */
  updateAccountStatus(
    accountId: Types.ObjectId,
    status: Partial<IDiscordAccount["status"]>,
  ): Promise<IDiscordAccount | null> {
    return DiscordAccount.findByIdAndUpdate(accountId, { $set: { status } }, { new: true }).exec();
  }

  /**
   * Update account metrics
   */
  updateAccountMetrics(
    accountId: Types.ObjectId,
    metrics: Partial<IDiscordAccount["metrics"]>,
  ): Promise<IDiscordAccount | null> {
    return DiscordAccount.findByIdAndUpdate(accountId, { $set: { metrics } }, { new: true }).exec();
  }

  /**
   * Start a Discord account worker
   */
  async startAccount(accountId: Types.ObjectId): Promise<boolean> {
    const account = await DiscordAccount.findById(accountId).exec();
    if (!account) {
      throw new Error("Account not found");
    }

    if (account.isActive) {
      logger.warn(`Account ${accountId} is already active`);
      return false;
    }

    try {
      await this.workerManager.startWorker(account);

      await DiscordAccount.findByIdAndUpdate(accountId, {
        $set: {
          isActive: true,
          "status.isConnected": false,
          "status.lastConnection": null,
        },
      }).exec();

      logger.info(`Started Discord account: ${accountId}`);
      return true;
    } catch (error) {
      logger.error(`Error starting Discord account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a Discord account worker
   */
  async stopAccount(accountId: Types.ObjectId): Promise<boolean> {
    const account = await DiscordAccount.findById(accountId).exec();
    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.isActive) {
      logger.warn(`Account ${accountId} is already inactive`);
      return false;
    }

    try {
      await this.workerManager.stopWorker(accountId.toString());

      await DiscordAccount.findByIdAndUpdate(accountId, {
        $set: {
          isActive: false,
          "status.isConnected": false,
          "status.lastDisconnection": new Date(),
        },
      }).exec();

      logger.info(`Stopped Discord account: ${accountId}`);
      return true;
    } catch (error) {
      logger.error(`Error stopping Discord account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a Discord account
   */
  async deleteAccount(accountId: Types.ObjectId): Promise<boolean> {
    const account = await DiscordAccount.findById(accountId).exec();
    if (!account) {
      return false;
    }

    if (account.isActive) {
      await this.stopAccount(accountId);
    }

    await DiscordAccount.findByIdAndDelete(accountId).exec();
    logger.info(`Deleted Discord account: ${accountId}`);
    return true;
  }

  /**
   * Get active accounts count
   */
  getActiveAccountsCount(): Promise<number> {
    return DiscordAccount.countDocuments({ isActive: true }).exec();
  }

  /**
   * Validate Discord token
   * A proper Discord token consists of three parts separated by periods:
   * 1. User ID (encoded in base64)
   * 2. Timestamp (encoded)
   * 3. HMAC (cryptographic signature)
   */
  validateToken(token: string): boolean {
    try {
      if (!token) return false;

      // Check basic format: three sections separated by periods
      const parts = token.split(".");
      if (parts.length !== 3) return false;

      const [idPart, timestampPart, hmacPart] = parts;

      // Check part lengths
      // User ID part should be around 20-30 characters
      if (idPart.length < 15 || idPart.length > 40) return false;

      // Timestamp part is usually around 6-10 characters
      if (timestampPart.length < 4 || timestampPart.length > 12) return false;

      // HMAC part is usually 27+ characters
      if (hmacPart.length < 25) return false;

      // Validate characters - Discord tokens use Base64 URL-safe character set
      // This includes alphanumeric characters, hyphens, and underscores
      const validCharRegex = /^[A-Za-z0-9_-]+$/;
      if (
        !validCharRegex.test(idPart) ||
        !validCharRegex.test(timestampPart) ||
        !validCharRegex.test(hmacPart)
      ) {
        return false;
      }

      // First part should be a valid Base64 string that decodes to a number
      try {
        // Try to decode the first part (user ID)
        // For Discord tokens, the first part is base64-encoded and should decode to a valid number
        const userIdBytes = Buffer.from(idPart, "base64").toString("utf-8");
        if (!/^\d+$/.test(userIdBytes)) return false;
      } catch {
        return false;
      }

      logger.info("Discord token validated successfully");
      return true;
    } catch (error) {
      logger.error("Error validating Discord token:", error);
      return false;
    }
  }
}
