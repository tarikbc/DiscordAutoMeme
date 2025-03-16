import { Types } from "mongoose";
import { DiscordAccount, IDiscordAccount, IDiscordAccountSettings } from "../models/DiscordAccount";
import logger from "../utils/logger";
import { encryptToken, decryptToken } from "../utils/encryption";
import { WorkerManager } from "../workers/WorkerManager";
import { createAuditLog } from "../models/AuditLog";
import { AccountService } from "./AccountService";
import cache from "../utils/cache";

export interface CreateAccountInput {
  userId: Types.ObjectId;
  name: string;
  token: string;
  settings?: Partial<IDiscordAccountSettings>;
}

export interface UpdateAccountInput {
  name?: string;
  token?: string;
  isActive?: boolean;
  settings?: Partial<IDiscordAccountSettings>;
}

interface BatchOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: { id: string; error: string }[];
}

export class DiscordAccountService {
  private static instance: DiscordAccountService;
  private workerManager: WorkerManager;

  private constructor() {
    this.workerManager = WorkerManager.getInstance();
  }

  public static getInstance(): DiscordAccountService {
    if (!DiscordAccountService.instance) {
      DiscordAccountService.instance = new DiscordAccountService();
    }
    return DiscordAccountService.instance;
  }

  async createAccount(input: CreateAccountInput): Promise<IDiscordAccount> {
    // Validate token format and structure
    const accountService = AccountService.getInstance(this.workerManager);
    if (!accountService.validateToken(input.token)) {
      throw new Error("Invalid Discord token format");
    }

    const encryptedToken = encryptToken(input.token);

    const account = new DiscordAccount({
      userId: input.userId,
      name: input.name,
      token: encryptedToken,
      isActive: true,
      settings: input.settings || {},
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

    await account.save();

    // Start worker for the new account
    if (account.isActive) {
      await this.workerManager.startWorker(account);
    }

    // Invalidate dashboard cache for this user
    this.invalidateDashboardCache(input.userId);

    return account;
  }

  getAccount(accountId: Types.ObjectId): Promise<IDiscordAccount | null> {
    return DiscordAccount.findById(accountId).exec();
  }

  getAccountsByUser(userId: Types.ObjectId): Promise<IDiscordAccount[]> {
    return DiscordAccount.find({ userId }).exec();
  }

  async updateAccount(
    accountId: Types.ObjectId,
    input: UpdateAccountInput,
  ): Promise<IDiscordAccount | null> {
    const update: any = { ...input };

    if (input.token) {
      // Validate token format and structure
      const accountService = AccountService.getInstance(this.workerManager);
      if (!accountService.validateToken(input.token)) {
        throw new Error("Invalid Discord token format");
      }
      update.token = encryptToken(input.token);
    }

    if (input.settings) {
      update.$set = {
        settings: input.settings,
      };
    }

    const account = await DiscordAccount.findByIdAndUpdate(accountId, update, {
      new: true,
    });

    if (!account) {
      return null;
    }

    // Handle worker based on active status change
    if (typeof input.isActive !== "undefined") {
      if (input.isActive) {
        await this.workerManager.startWorker(account);
      } else {
        await this.workerManager.stopWorker(accountId.toString());
      }
    }
    // Update worker settings if they changed
    else if (input.settings) {
      const mergedSettings = {
        ...account.settings,
        ...input.settings,
      };
      await this.workerManager.updateWorkerSettings(account, mergedSettings);
    }

    // Invalidate dashboard cache for this user
    this.invalidateDashboardCache(account.userId);

    return account;
  }

  async deleteAccount(accountId: Types.ObjectId): Promise<boolean> {
    // Get account to find user ID before deletion
    const account = await DiscordAccount.findById(accountId);
    if (!account) {
      return false;
    }

    // Store user ID for cache invalidation
    const userId = account.userId;

    // Stop the worker first
    await this.workerManager.stopWorker(accountId.toString());

    const result = await DiscordAccount.findByIdAndDelete(accountId);

    // Invalidate dashboard cache
    if (result) {
      this.invalidateDashboardCache(userId);
    }

    return result !== null;
  }

  getDecryptedToken(account: IDiscordAccount): string {
    return decryptToken(account.token);
  }

  // Start all active accounts' workers (used during service startup)
  async startAllWorkers(): Promise<void> {
    const activeAccounts = await DiscordAccount.find({ isActive: true });

    for (const account of activeAccounts) {
      await this.workerManager.startWorker(account);
    }
  }

  // Stop all workers (used during service shutdown)
  async stopAllWorkers(): Promise<void> {
    const activeAccounts = await DiscordAccount.find({ isActive: true });

    for (const account of activeAccounts) {
      const accountId = account._id;
      if (accountId) {
        await this.workerManager.stopWorker(accountId.toString());
      }
    }
  }

  /**
   * Start multiple Discord accounts
   * @param accountIds Array of account IDs to start
   * @param userId User performing the operation
   */
  async batchStartAccounts(
    accountIds: Types.ObjectId[],
    userId: Types.ObjectId,
  ): Promise<BatchOperationResult> {
    logger.info(`Batch starting ${accountIds.length} Discord accounts`);

    const result: BatchOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    for (const accountId of accountIds) {
      try {
        const account = await DiscordAccount.findById(accountId);
        if (!account) {
          result.failureCount++;
          result.errors.push({ id: accountId.toString(), error: "Account not found" });
          continue;
        }

        if (account.isActive) {
          // Skip already active accounts
          continue;
        }

        // Start the worker and update account status
        await this.workerManager.startWorker(account);
        await DiscordAccount.findByIdAndUpdate(accountId, {
          $set: { isActive: true },
        });

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          id: accountId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Create audit log entry
    const status =
      result.failureCount === 0 ? "success" : result.successCount > 0 ? "partial" : "failed";
    await createAuditLog(
      "batch_start_accounts",
      userId,
      "discord_account",
      accountIds,
      { totalAccounts: accountIds.length },
      status,
      result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
    );

    result.success = result.successCount > 0;
    return result;
  }

  /**
   * Stop multiple Discord accounts
   * @param accountIds Array of account IDs to stop
   * @param userId User performing the operation
   */
  async batchStopAccounts(
    accountIds: Types.ObjectId[],
    userId: Types.ObjectId,
  ): Promise<BatchOperationResult> {
    logger.info(`Batch stopping ${accountIds.length} Discord accounts`);

    const result: BatchOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    for (const accountId of accountIds) {
      try {
        const account = await DiscordAccount.findById(accountId);
        if (!account) {
          result.failureCount++;
          result.errors.push({ id: accountId.toString(), error: "Account not found" });
          continue;
        }

        if (!account.isActive) {
          // Skip already inactive accounts
          continue;
        }

        // Stop the worker and update account status
        await this.workerManager.stopWorker(accountId.toString());
        await DiscordAccount.findByIdAndUpdate(accountId, {
          $set: { isActive: false },
        });

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          id: accountId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Create audit log entry
    const status =
      result.failureCount === 0 ? "success" : result.successCount > 0 ? "partial" : "failed";
    await createAuditLog(
      "batch_stop_accounts",
      userId,
      "discord_account",
      accountIds,
      { totalAccounts: accountIds.length },
      status,
      result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
    );

    result.success = result.successCount > 0;
    return result;
  }

  /**
   * Delete multiple Discord accounts
   * @param accountIds Array of account IDs to delete
   * @param userId User performing the operation
   */
  async batchDeleteAccounts(
    accountIds: Types.ObjectId[],
    userId: Types.ObjectId,
  ): Promise<BatchOperationResult> {
    logger.info(`Batch deleting ${accountIds.length} Discord accounts`);

    const result: BatchOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    for (const accountId of accountIds) {
      try {
        const account = await DiscordAccount.findById(accountId);
        if (!account) {
          result.failureCount++;
          result.errors.push({ id: accountId.toString(), error: "Account not found" });
          continue;
        }

        // Stop the worker if account is active
        if (account.isActive) {
          await this.workerManager.stopWorker(accountId.toString());
        }

        // Delete the account
        await DiscordAccount.findByIdAndDelete(accountId);

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          id: accountId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Create audit log entry
    const status =
      result.failureCount === 0 ? "success" : result.successCount > 0 ? "partial" : "failed";
    await createAuditLog(
      "batch_delete_accounts",
      userId,
      "discord_account",
      accountIds,
      { totalAccounts: accountIds.length },
      status,
      result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
    );

    result.success = result.successCount > 0;
    return result;
  }

  /**
   * Update settings for multiple Discord accounts
   * @param accountIds Array of account IDs to update
   * @param settings Settings to update
   * @param userId User performing the operation
   */
  async batchUpdateAccountSettings(
    accountIds: Types.ObjectId[],
    settings: Partial<IDiscordAccountSettings>,
    userId: Types.ObjectId,
  ): Promise<BatchOperationResult> {
    logger.info(`Batch updating settings for ${accountIds.length} Discord accounts`);

    const result: BatchOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    for (const accountId of accountIds) {
      try {
        const account = await DiscordAccount.findById(accountId);
        if (!account) {
          result.failureCount++;
          result.errors.push({ id: accountId.toString(), error: "Account not found" });
          continue;
        }

        // Update account settings
        await DiscordAccount.findByIdAndUpdate(accountId, {
          $set: { settings: { ...account.settings, ...settings } },
        });

        // If account is active, update worker settings
        if (account.isActive) {
          await this.workerManager.updateWorkerSettings(account, {
            ...account.settings,
            ...settings,
          });
        }

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          id: accountId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Create audit log entry
    const status =
      result.failureCount === 0 ? "success" : result.successCount > 0 ? "partial" : "failed";
    await createAuditLog(
      "batch_update_account_settings",
      userId,
      "discord_account",
      accountIds,
      { settings, totalAccounts: accountIds.length },
      status,
      result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
    );

    result.success = result.successCount > 0;
    return result;
  }

  /**
   * Get accounts for a user with pagination and sorting
   * @param userId The user ID
   * @param page Page number (1-indexed)
   * @param limit Number of items per page
   * @param sortBy Field to sort by
   * @param sortOrder Sort direction
   */
  async getAccountsByUserPaginated(
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<{ accounts: IDiscordAccount[]; total: number }> {
    // Build sort object
    const sort: { [key: string]: 1 | -1 } = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination and sorting
    const [accounts, total] = await Promise.all([
      DiscordAccount.find({ userId }).skip(skip).limit(limit).sort(sort).exec(),
      DiscordAccount.countDocuments({ userId }).exec(),
    ]);

    return { accounts, total };
  }

  /**
   * Get health data for a Discord account
   * @param accountId ID of the Discord account to check
   * @returns Health metrics for the account or null if unavailable
   */
  getAccountHealth(accountId: Types.ObjectId): {
    status: "connected" | "disconnected" | "unknown";
    tokenStatus: "valid" | "invalid" | "unknown";
    disconnectionCount: number;
    lastDisconnect?: Date;
    errorRate: number;
    errorCount: number;
    requestCount: number;
    rateLimited: boolean;
    rateLimitResetAt?: Date;
    rateLimitRemaining?: number;
  } | null {
    try {
      const worker = WorkerManager.getInstance().getWorker(accountId.toString());

      if (!worker) {
        logger.warn(`No worker found for account ${accountId}`);
        return null;
      }

      // Get worker status from WorkerManager
      const status = WorkerManager.getInstance().getWorkerStatus(accountId.toString());
      if (!status) {
        logger.warn(`No status found for account ${accountId}`);
        return null;
      }

      // Get metrics from worker via WorkerManager
      const metrics = WorkerManager.getInstance().getMetrics();

      return {
        status: status.isConnected ? "connected" : "disconnected",
        tokenStatus: status.hasError ? "invalid" : "valid",
        disconnectionCount: status.reconnectAttempts || 0,
        lastDisconnect: status.lastActivity,
        errorRate:
          metrics.requestCount > 0
            ? Math.round((metrics.errorCount / metrics.requestCount) * 100)
            : 0,
        errorCount: metrics.errorCount || 0,
        requestCount: metrics.requestCount || 0,
        rateLimited: false, // Default value as we don't have this information directly
        rateLimitResetAt: undefined,
        rateLimitRemaining: undefined,
      };
    } catch (error) {
      logger.error(`Error getting health data for account ${accountId}:`, error);
      return null;
    }
  }

  /**
   * List all Discord accounts with pagination
   * @param options Filtering and pagination options
   * @returns Paginated list of accounts
   */
  async listAccounts(options: {
    userId?: Types.ObjectId;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ accounts: IDiscordAccount[]; total: number }> {
    const {
      userId,
      isActive,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    // Build query
    const query: any = {};
    if (userId) query.userId = userId;
    if (isActive !== undefined) query.isActive = isActive;

    // Build sort object
    const sort: { [key: string]: 1 | -1 } = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [accounts, total] = await Promise.all([
      DiscordAccount.find(query).sort(sort).skip(skip).limit(limit),
      DiscordAccount.countDocuments(query),
    ]);

    return { accounts, total };
  }

  /**
   * Helper method to invalidate dashboard cache for a user
   * @param userId User ID whose cache should be invalidated
   */
  private invalidateDashboardCache(userId: Types.ObjectId): void {
    const userIdStr = userId.toString();
    cache.deleteByPrefix(`dashboard:accounts:${userIdStr}`);
    cache.deleteByPrefix(`dashboard:activity:${userIdStr}`);
    cache.deleteByPrefix(`dashboard:content:${userIdStr}`);
    cache.deleteByPrefix(`dashboard:system:${userIdStr}`);
    logger.debug(`Invalidated dashboard cache for user ${userIdStr}`);
  }
}
