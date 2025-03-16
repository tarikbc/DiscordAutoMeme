import { Types } from "mongoose";
import { DiscordAccount, IDiscordAccount } from "../models/DiscordAccount";
import { encryptToken, decryptToken } from "../utils/encryption";
import { WorkerManager } from "../workers/WorkerManager";

export interface CreateAccountInput {
  userId: Types.ObjectId;
  name: string;
  token: string;
  settings?: IDiscordAccount["settings"];
}

export interface UpdateAccountInput {
  name?: string;
  token?: string;
  isActive?: boolean;
  settings?: Partial<IDiscordAccount["settings"]>;
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

    return account;
  }

  async deleteAccount(accountId: Types.ObjectId): Promise<boolean> {
    // Stop the worker first
    await this.workerManager.stopWorker(accountId.toString());

    const result = await DiscordAccount.findByIdAndDelete(accountId);
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
}
