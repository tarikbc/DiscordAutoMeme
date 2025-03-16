import { Worker } from "worker_threads";
import { Types, Document } from "mongoose";
import { WorkerManager } from "../../workers/WorkerManager";
import { IDiscordAccount, IDiscordAccountModel } from "../../models/DiscordAccount";
import { decryptToken } from "../../utils/encryption";

jest.mock("worker_threads", () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    once: jest.fn(),
    postMessage: jest.fn(),
    threadId: 1,
  })),
}));
jest.mock("../../utils/encryption");

type DiscordAccountDocument = Document<unknown, Record<string, never>, IDiscordAccount> &
  IDiscordAccountModel;

describe("WorkerManager", () => {
  let workerManager: WorkerManager;
  let mockWorker: jest.Mocked<Worker>;
  let mockAccount: DiscordAccountDocument;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Worker constructor
    mockWorker = new Worker("test") as unknown as jest.Mocked<Worker>;

    // Mock decryptToken
    (decryptToken as jest.Mock).mockImplementation(token => `decrypted_${token}`);

    // Get WorkerManager instance
    workerManager = WorkerManager.getInstance();

    // Create mock account with Document methods
    const accountData = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      name: "Test Account",
      token: "test_token",
      isActive: true,
      settings: {
        autoReconnect: true,
        statusUpdateInterval: 60000,
        contentPreferences: {
          memes: true,
          gifs: true,
          quotes: true,
          news: true,
          jokes: true,
        },
        deliveryPreferences: {
          frequency: 3600000,
          timeWindows: [{ start: "09:00", end: "17:00" }],
        },
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAccount = {
      ...accountData,
      updateStatus: jest.fn(),
      updateMetrics: jest.fn(),
      save: jest.fn().mockResolvedValue(accountData),
      toJSON: jest.fn().mockReturnValue(accountData),
      toObject: jest.fn().mockReturnValue(accountData),
      $isNew: false,
      $init: jest.fn(),
      $session: jest.fn(),
      $assertPopulated: jest.fn(),
      $clone: jest.fn(),
      equals: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      unset: jest.fn(),
      increment: jest.fn(),
      remove: jest.fn(),
      populate: jest.fn(),
      populated: jest.fn(),
      depopulate: jest.fn(),
      execPopulate: jest.fn(),
      validate: jest.fn(),
      validateSync: jest.fn(),
      invalidate: jest.fn(),
      isModified: jest.fn(),
      isDirectModified: jest.fn(),
      isInit: jest.fn(),
      isSelected: jest.fn(),
      markModified: jest.fn(),
      modifiedPaths: jest.fn(),
      $ignore: jest.fn(),
      directModifiedPaths: jest.fn(),
      id: accountData._id.toString(),
      __v: 0,
    } as unknown as DiscordAccountDocument;
  });

  describe("Worker Lifecycle", () => {
    it("should start a worker thread", async () => {
      await workerManager.startWorker(mockAccount);

      expect(Worker).toHaveBeenCalledWith(
        expect.stringContaining("DiscordWorker.js"),
        expect.objectContaining({
          workerData: {
            accountId: mockAccount._id.toString(),
            token: "decrypted_test_token",
            settings: mockAccount.settings,
          },
        }),
      );

      expect(mockWorker.on).toHaveBeenCalledWith("message", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("exit", expect.any(Function));
    });

    it("should not start duplicate workers for the same account", async () => {
      await workerManager.startWorker(mockAccount);
      await workerManager.startWorker(mockAccount);

      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it("should stop a worker thread", async () => {
      await workerManager.startWorker(mockAccount);

      // Mock successful worker termination
      mockWorker.once = jest.fn().mockImplementation((event, callback) => {
        if (event === "exit") {
          callback(0);
        }
        return mockWorker;
      });

      await workerManager.stopWorker(mockAccount._id.toString());

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: "STOP",
        data: { accountId: mockAccount._id.toString() },
      });
    });

    it("should update worker settings", async () => {
      await workerManager.startWorker(mockAccount);

      const newSettings = {
        ...mockAccount.settings,
        autoReconnect: false,
      };

      await workerManager.updateWorkerSettings(mockAccount, newSettings);

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: "UPDATE_SETTINGS",
        data: {
          accountId: mockAccount._id.toString(),
          settings: newSettings,
        },
      });
    });
  });

  describe("Worker Status and Metrics", () => {
    beforeEach(async () => {
      await workerManager.startWorker(mockAccount);
    });

    it("should get worker status", () => {
      const status = workerManager.getWorkerStatus(mockAccount._id.toString());

      expect(status).toBeDefined();
      expect(status?.accountId).toBe(mockAccount._id.toString());
      expect(status?.isConnected).toBe(true);
      expect(status?.hasError).toBe(false);
      expect(status?.memoryUsage).toBeGreaterThan(0);
    });

    it("should get all workers status", () => {
      const allStatus = workerManager.getAllWorkersStatus();

      expect(Array.isArray(allStatus)).toBe(true);
      expect(allStatus).toHaveLength(1);
      expect(allStatus[0].accountId).toBe(mockAccount._id.toString());
    });

    it("should get worker metrics", () => {
      const metrics = workerManager.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.threadCount).toBe(1);
      expect(metrics.requestsPerMinute).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Event Handling", () => {
    it("should handle worker messages", async () => {
      const messageHandler = jest.fn();
      workerManager.on("worker:message", messageHandler);

      await workerManager.startWorker(mockAccount);

      // Simulate worker message
      const mockMessage = {
        type: "STATUS",
        data: {
          accountId: mockAccount._id.toString(),
          status: { isConnected: true },
        },
      };

      // Get the message handler that was registered
      const onMessageHandler = (mockWorker.on as jest.Mock).mock.calls.find(
        call => call[0] === "message",
      )[1];

      // Call the handler with our mock message
      onMessageHandler(mockMessage);

      expect(messageHandler).toHaveBeenCalledWith(mockMessage);
    });

    it("should handle worker errors", async () => {
      const errorHandler = jest.fn();
      workerManager.on("worker:error", errorHandler);

      await workerManager.startWorker(mockAccount);

      // Simulate worker error
      const mockError = new Error("Test error");

      // Get the error handler that was registered
      const onErrorHandler = (mockWorker.on as jest.Mock).mock.calls.find(
        call => call[0] === "error",
      )[1];

      // Call the handler with our mock error
      onErrorHandler(mockError);

      expect(errorHandler).toHaveBeenCalledWith({
        accountId: mockAccount._id.toString(),
        error: {
          message: mockError.message,
          stack: mockError.stack,
        },
      });
    });

    it("should handle worker exit", async () => {
      const exitHandler = jest.fn();
      workerManager.on("worker:exit", exitHandler);

      await workerManager.startWorker(mockAccount);

      // Get the exit handler that was registered
      const onExitHandler = (mockWorker.on as jest.Mock).mock.calls.find(
        call => call[0] === "exit",
      )[1];

      // Call the handler with exit code
      onExitHandler(1);

      expect(exitHandler).toHaveBeenCalledWith({
        accountId: mockAccount._id.toString(),
        code: 1,
      });
    });
  });

  describe("Cleanup", () => {
    it("should stop all workers", async () => {
      // Start multiple workers
      const mockAccount2 = {
        ...mockAccount,
        _id: new Types.ObjectId(),
      } as DiscordAccountDocument;

      await workerManager.startWorker(mockAccount);
      await workerManager.startWorker(mockAccount2);

      // Mock successful worker termination
      mockWorker.once = jest.fn().mockImplementation((event, callback) => {
        if (event === "exit") {
          callback(0);
        }
        return mockWorker;
      });

      await workerManager.stopAllWorkers();

      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
      expect(workerManager.getWorkerCount()).toBe(0);
    });
  });

  describe("startWorker", () => {
    it("should start a new worker for a Discord account", async () => {
      const result = await workerManager.startWorker(mockAccount);
      expect(result).toBe(true);
      expect(Worker).toHaveBeenCalled();
      expect(mockWorker.on).toHaveBeenCalledWith("message", expect.any(Function));
      expect(mockWorker.once).toHaveBeenCalledWith("exit", expect.any(Function));
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: "START",
        account: mockAccount,
        decryptedToken: "decrypted_test_token",
      });
    });

    it("should not start a worker if one already exists", async () => {
      await workerManager.startWorker(mockAccount);
      const result = await workerManager.startWorker(mockAccount);
      expect(result).toBe(false);
    });
  });

  describe("stopWorker", () => {
    it("should stop an existing worker", async () => {
      await workerManager.startWorker(mockAccount);
      const result = await workerManager.stopWorker(mockAccount._id.toString());
      expect(result).toBe(true);
    });

    it("should return false if no worker exists", async () => {
      const result = await workerManager.stopWorker(mockAccount._id.toString());
      expect(result).toBe(false);
    });
  });

  describe("updateWorkerSettings", () => {
    it("should update settings for an existing worker", async () => {
      await workerManager.startWorker(mockAccount);
      const result = await workerManager.updateWorkerSettings(mockAccount, mockAccount.settings);
      expect(result).toBe(true);
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: "UPDATE_SETTINGS",
        settings: mockAccount.settings,
      });
    });

    it("should return false if no worker exists", async () => {
      const result = await workerManager.updateWorkerSettings(mockAccount, mockAccount.settings);
      expect(result).toBe(false);
    });
  });

  describe("getWorkerStatus", () => {
    it("should return worker status if worker exists", async () => {
      await workerManager.startWorker(mockAccount);
      const status = workerManager.getWorkerStatus(mockAccount._id.toString());
      expect(status).toBeDefined();
      expect(status?.isConnected).toBe(true);
      expect(status?.hasError).toBe(false);
      expect(status?.memoryUsage).toBeGreaterThan(0);
    });

    it("should return null if no worker exists", () => {
      const status = workerManager.getWorkerStatus(mockAccount._id.toString());
      expect(status).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("should stop all workers", async () => {
      await workerManager.startWorker(mockAccount);
      await workerManager.stopAllWorkers();
      expect(workerManager.getWorkerStatus(mockAccount._id.toString())).toBeNull();
    });
  });
});
