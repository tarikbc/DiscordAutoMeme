import request from "supertest";
import { Types } from "mongoose";
import app from "../../app";
import { DiscordAccount } from "../../models/DiscordAccount";
import { User } from "../../models/User";
import { WorkerManager } from "../../workers/WorkerManager";
import { encryptToken } from "../../utils/encryption";

jest.mock("../../workers/WorkerManager");

describe("Discord Account API", () => {
  let mockUser: any;
  let mockAccount: any;
  let mockWorkerManager: jest.Mocked<WorkerManager>;

  beforeEach(async () => {
    // Create test user
    mockUser = await User.create({
      email: "test@example.com",
      passwordHash: "hashed_password",
      roles: [],
    });

    // Create test Discord account
    mockAccount = await DiscordAccount.create({
      userId: mockUser._id,
      name: "Test Account",
      token: await encryptToken("test_token"),
      isActive: false,
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
    });

    // Mock WorkerManager
    mockWorkerManager = WorkerManager.getInstance() as jest.Mocked<WorkerManager>;
    mockWorkerManager.startWorker.mockImplementation(() => {
      return Promise.resolve();
    });
    mockWorkerManager.stopWorker.mockImplementation(() => {
      return Promise.resolve();
    });
    mockWorkerManager.updateWorkerSettings.mockImplementation(() => {
      return Promise.resolve();
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await DiscordAccount.deleteMany({});
    jest.clearAllMocks();
  });

  describe("GET /api/accounts", () => {
    it("should return all Discord accounts for a user", async () => {
      const response = await request(app).get("/api/accounts");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe("Test Account");
    });

    it("should return empty array when user has no accounts", async () => {
      await DiscordAccount.deleteMany({});
      const response = await request(app).get("/api/accounts");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      jest.spyOn(DiscordAccount, "find").mockRejectedValueOnce(new Error("DB Error"));
      const response = await request(app).get("/api/accounts");
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("GET /api/accounts/:id", () => {
    it("should return a specific Discord account", async () => {
      const response = await request(app).get(`/api/accounts/${mockAccount._id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Test Account");
      expect(response.body.settings.autoReconnect).toBe(true);
    });

    it("should return 404 for non-existent account", async () => {
      const nonExistentId = new Types.ObjectId();
      const response = await request(app).get(`/api/accounts/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Discord account not found");
    });

    it("should return 400 for invalid account ID", async () => {
      const response = await request(app).get("/api/accounts/invalid-id");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid account ID");
    });

    it("should handle database errors gracefully", async () => {
      jest.spyOn(DiscordAccount, "findById").mockRejectedValueOnce(new Error("DB Error"));
      const response = await request(app).get(`/api/accounts/${mockAccount._id}`);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("POST /api/accounts", () => {
    it("should create a new Discord account", async () => {
      const newAccount = {
        name: "New Account",
        token: "new_test_token_that_is_long_enough_to_pass_validation_50_chars_minimum",
        settings: {
          autoReconnect: true,
          statusUpdateInterval: 60000,
        },
      };

      const response = await request(app).post("/api/accounts").send(newAccount);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("New Account");
      expect(response.body.settings.autoReconnect).toBe(true);
    });

    it("should validate required fields", async () => {
      const invalidAccount = {
        name: "New Account",
        // Missing token
      };

      const response = await request(app).post("/api/accounts").send(invalidAccount);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Token is required");
    });

    it("should validate token length", async () => {
      const invalidAccount = {
        name: "New Account",
        token: "short",
      };

      const response = await request(app).post("/api/accounts").send(invalidAccount);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Token must be at least 50 characters long");
    });

    it("should handle duplicate account names", async () => {
      const duplicateAccount = {
        name: "Test Account", // Same name as mockAccount
        token: "new_test_token_that_is_long_enough_to_pass_validation_50_chars_minimum",
      };

      const response = await request(app).post("/api/accounts").send(duplicateAccount);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Account name already exists");
    });
  });

  describe("PATCH /api/accounts/:id", () => {
    it("should update a Discord account", async () => {
      const updates = {
        name: "Updated Account",
        settings: {
          autoReconnect: false,
        },
      };

      const response = await request(app).patch(`/api/accounts/${mockAccount._id}`).send(updates);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Updated Account");
      expect(response.body.settings.autoReconnect).toBe(false);
    });

    it("should validate update data", async () => {
      const invalidUpdates = {
        name: "", // Empty name
      };

      const response = await request(app)
        .patch(`/api/accounts/${mockAccount._id}`)
        .send(invalidUpdates);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Name cannot be empty");
    });

    it("should handle partial updates", async () => {
      const partialUpdate = {
        settings: {
          statusUpdateInterval: 120000,
        },
      };

      const response = await request(app)
        .patch(`/api/accounts/${mockAccount._id}`)
        .send(partialUpdate);

      expect(response.status).toBe(200);
      expect(response.body.settings.statusUpdateInterval).toBe(120000);
      expect(response.body.settings.autoReconnect).toBe(true); // Unchanged
    });
  });

  describe("DELETE /api/accounts/:id", () => {
    it("should delete a Discord account", async () => {
      const response = await request(app).delete(`/api/accounts/${mockAccount._id}`);

      expect(response.status).toBe(204);

      // Verify account is deleted
      const deleted = await DiscordAccount.findById(mockAccount._id);
      expect(deleted).toBeNull();
    });

    it("should stop worker before deleting active account", async () => {
      // Set account as active
      await DiscordAccount.findByIdAndUpdate(mockAccount._id, {
        isActive: true,
      });

      const response = await request(app).delete(`/api/accounts/${mockAccount._id}`);

      expect(response.status).toBe(204);
      expect(mockWorkerManager.stopWorker).toHaveBeenCalledWith(mockAccount._id.toString());
    });

    it("should handle deletion of non-existent account", async () => {
      const nonExistentId = new Types.ObjectId();
      const response = await request(app).delete(`/api/accounts/${nonExistentId}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/accounts/:id/start", () => {
    it("should start a Discord client", async () => {
      const response = await request(app).post(`/api/accounts/${mockAccount._id}/start`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Discord client started");
      expect(response.body.account.isActive).toBe(true);
      expect(mockWorkerManager.startWorker).toHaveBeenCalled();
    });

    it("should not start already active client", async () => {
      // Set account as active
      await DiscordAccount.findByIdAndUpdate(mockAccount._id, {
        isActive: true,
      });

      const response = await request(app).post(`/api/accounts/${mockAccount._id}/start`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Discord client is already active");
    });

    it("should handle worker start failure", async () => {
      mockWorkerManager.startWorker.mockImplementation(() => {
        throw new Error("Failed to start worker");
      });

      const response = await request(app).post(`/api/accounts/${mockAccount._id}/start`);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to start Discord client");
    });
  });

  describe("POST /api/accounts/:id/stop", () => {
    it("should stop a Discord client", async () => {
      // Set account as active
      await DiscordAccount.findByIdAndUpdate(mockAccount._id, {
        isActive: true,
      });

      const response = await request(app).post(`/api/accounts/${mockAccount._id}/stop`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Discord client stopped");
      expect(response.body.account.isActive).toBe(false);
      expect(mockWorkerManager.stopWorker).toHaveBeenCalled();
    });

    it("should not stop already inactive client", async () => {
      const response = await request(app).post(`/api/accounts/${mockAccount._id}/stop`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Discord client is not active");
    });

    it("should handle worker stop failure", async () => {
      // Set account as active
      await DiscordAccount.findByIdAndUpdate(mockAccount._id, {
        isActive: true,
      });
      mockWorkerManager.stopWorker.mockImplementation(() => {
        throw new Error("Failed to stop worker");
      });

      const response = await request(app).post(`/api/accounts/${mockAccount._id}/stop`);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to stop Discord client");
    });
  });
});
