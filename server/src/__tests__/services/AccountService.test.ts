import { Types, Document } from "mongoose";
import { AccountService } from "../../services/AccountService";
import { User, IUser } from "../../models/User";
import { DiscordAccount } from "../../models/DiscordAccount";
import { WorkerManager } from "../../workers/WorkerManager";
import { encryptToken } from "../../utils/encryption";

type UserDocument = Document & IUser & { _id: Types.ObjectId };

jest.mock("../../workers/WorkerManager");
jest.mock("../../utils/encryption");

describe("AccountService", () => {
  let accountService: AccountService;
  let mockWorkerManager: jest.Mocked<WorkerManager>;

  beforeEach(() => {
    mockWorkerManager = WorkerManager.getInstance() as jest.Mocked<WorkerManager>;
    accountService = AccountService.getInstance(mockWorkerManager);

    (encryptToken as jest.Mock).mockImplementation(token => `encrypted_${token}`);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await DiscordAccount.deleteMany({});
  });

  describe("User Management", () => {
    it("should create a new user", async () => {
      const user = await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      });

      expect(user).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.roles).toEqual([]);
      expect(user.setupCompleted).toBe(false);
    });

    it("should not create a user with duplicate email", async () => {
      await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      });

      await expect(
        accountService.createUser({
          email: "test@example.com",
          passwordHash: "another_password",
        }),
      ).rejects.toThrow("Email already in use");
    });

    it("should get user by ID", async () => {
      const created = (await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      })) as UserDocument;

      const user = await accountService.getUserById(created._id);
      expect(user).toBeDefined();
      expect(user?.email).toBe("test@example.com");
    });

    it("should update user", async () => {
      const created = (await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      })) as UserDocument;

      const updated = await accountService.updateUser(created._id, {
        email: "updated@example.com",
      });

      expect(updated).toBeDefined();
      expect(updated?.email).toBe("updated@example.com");
    });

    it("should complete user setup", async () => {
      const created = (await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      })) as UserDocument;

      const updated = await accountService.completeSetup(created._id);
      expect(updated).toBeDefined();
      expect(updated?.setupCompleted).toBe(true);
    });
  });

  describe("Discord Account Management", () => {
    let user: UserDocument;

    beforeEach(async () => {
      user = (await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      })) as UserDocument;
    });

    it("should add Discord account to user", async () => {
      const result = await accountService.addDiscordAccount(user._id, "Test Account", "test_token");

      expect(result).toBeDefined();
      const accounts = await accountService.getUserDiscordAccounts(user._id);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe("Test Account");
      expect(accounts[0].token).toBe("encrypted_test_token");
    });

    it("should get user Discord accounts", async () => {
      await accountService.addDiscordAccount(user._id, "Account 1", "token_1");
      await accountService.addDiscordAccount(user._id, "Account 2", "token_2");

      const accounts = await accountService.getUserDiscordAccounts(user._id);
      expect(accounts).toHaveLength(2);
      expect(accounts.map(a => a.name)).toEqual(["Account 1", "Account 2"]);
    });

    it("should update account settings", async () => {
      await accountService.addDiscordAccount(user._id, "Test Account", "test_token");

      const discordAccount = await DiscordAccount.findOne({ userId: user._id });
      if (!discordAccount) throw new Error("Account not found");

      const updatedAccount = await accountService.updateAccountSettings(discordAccount._id, {
        autoReconnect: false,
        statusUpdateInterval: 120000,
      });

      expect(updatedAccount).toBeDefined();
      expect(updatedAccount?.settings.autoReconnect).toBe(false);
      expect(updatedAccount?.settings.statusUpdateInterval).toBe(120000);

      // If account is active, worker settings should be updated
      if (updatedAccount?.isActive) {
        expect(mockWorkerManager.updateWorkerSettings).toHaveBeenCalled();
      }
    });

    it("should start and stop Discord account", async () => {
      await accountService.addDiscordAccount(user._id, "Test Account", "test_token");

      const discordAccount = await DiscordAccount.findOne({ userId: user._id });
      if (!discordAccount) throw new Error("Account not found");

      // Start account
      await accountService.startAccount(discordAccount._id);
      let updated = await DiscordAccount.findById(discordAccount._id);
      expect(updated?.isActive).toBe(true);
      expect(mockWorkerManager.startWorker).toHaveBeenCalled();

      // Stop account
      await accountService.stopAccount(discordAccount._id);
      updated = await DiscordAccount.findById(discordAccount._id);
      expect(updated?.isActive).toBe(false);
      expect(mockWorkerManager.stopWorker).toHaveBeenCalled();
    });

    it("should delete Discord account", async () => {
      await accountService.addDiscordAccount(user._id, "Test Account", "test_token");

      const discordAccount = await DiscordAccount.findOne({ userId: user._id });
      if (!discordAccount) throw new Error("Account not found");

      const result = await accountService.deleteAccount(discordAccount._id);
      expect(result).toBe(true);

      const deleted = await DiscordAccount.findById(discordAccount._id);
      expect(deleted).toBeNull();
    });
  });

  describe("Account Status and Metrics", () => {
    let user: any;
    let discordAccount: any;

    beforeEach(async () => {
      user = await accountService.createUser({
        email: "test@example.com",
        passwordHash: "hashed_password",
      });

      await accountService.addDiscordAccount(user._id, "Test Account", "test_token");

      discordAccount = await DiscordAccount.findOne({ userId: user._id });
    });

    it("should update account status", async () => {
      const updated = await accountService.updateAccountStatus(discordAccount._id, {
        isConnected: true,
        lastConnection: new Date(),
      });

      expect(updated).toBeDefined();
      expect(updated?.status.isConnected).toBe(true);
      expect(updated?.status.lastConnection).toBeDefined();
    });

    it("should update account metrics", async () => {
      const updated = await accountService.updateAccountMetrics(discordAccount._id, {
        messagesSent: 10,
        messagesReceived: 5,
        errors: 1,
        uptime: 3600,
      });

      expect(updated).toBeDefined();
      expect(updated?.metrics.messagesSent).toBe(10);
      expect(updated?.metrics.messagesReceived).toBe(5);
      expect(updated?.metrics.errors).toBe(1);
      expect(updated?.metrics.uptime).toBe(3600);
    });
  });
});
