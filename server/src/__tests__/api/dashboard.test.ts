import mongoose from "mongoose";
import request from "supertest";
import app from "../../app";
import { User, UserDocument } from "../../models/User";
import { DiscordAccount } from "../../models/DiscordAccount";
import { SystemMetrics } from "../../models/SystemMetrics";
import { WorkerManager } from "../../workers/WorkerManager";
import cache from "../../utils/cache";
import jwt from "jsonwebtoken";
import config from "../../config";

// Mock dependencies
jest.mock("../../workers/WorkerManager");
jest.mock("../../utils/logger", () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("Dashboard API Routes", () => {
  let authToken: string;
  let testUser: UserDocument;
  let testAccountId: mongoose.Types.ObjectId;
  let mockWorkerManager: jest.Mocked<WorkerManager>;

  beforeAll(async () => {
    // Set up test database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test-db");

    // Create test user
    testUser = await User.create({
      email: "dashboard-test@example.com",
      password: "password123",
      name: "Dashboard Test User",
      role: "admin",
    });

    // Create test Discord account
    const account = await DiscordAccount.create({
      userId: testUser._id,
      name: "Test Discord Account",
      token: "encrypted-token-for-testing",
      isActive: true,
      settings: {},
      status: {
        isConnected: true,
        lastConnection: new Date(),
        lastDisconnection: null,
        currentActivity: null,
      },
      metrics: {
        messagesSent: 10,
        messagesReceived: 20,
        errors: 1,
        uptime: 3600,
      },
    });
    testAccountId = account._id;

    // Create test system metrics
    await SystemMetrics.create({
      timestamp: new Date(),
      cpuUsage: 25.5,
      memoryUsage: { total: 8192, used: 4096, free: 4096 },
      threadCount: 4,
      activeClients: 1,
      activeUsers: 1,
      requestsPerMinute: 60,
      errorRate: 0.5,
    });

    // Mock WorkerManager
    mockWorkerManager = WorkerManager.getInstance() as jest.Mocked<WorkerManager>;
    mockWorkerManager.getWorkerStatus.mockReturnValue({
      accountId: testAccountId.toString(),
      isConnected: true,
      hasError: false,
      uptime: 3600,
      memoryUsage: 100,
      reconnectAttempts: 0,
      lastActivity: new Date(),
    });
    mockWorkerManager.getMetrics.mockReturnValue({
      threadCount: 1,
      requestsPerMinute: 60,
      errorRate: 0.5,
      memoryUsage: 100,
      uptime: 3600,
      requestCount: 120,
      errorCount: 2,
      presenceUpdatesPerMinute: 10,
    });

    // Generate JWT token for authentication
    authToken = jwt.sign({ userId: testUser._id }, config.jwt.secret, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await DiscordAccount.deleteMany({});
    await SystemMetrics.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(() => {
    cache.clear();
  });

  describe("GET /api/dashboard/accounts", () => {
    it("should return account statistics", async () => {
      const response = await request(app)
        .get("/api/dashboard/accounts")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("summary");
      expect(response.body).toHaveProperty("accounts");
      expect(response.body.summary).toHaveProperty("totalAccounts");
      expect(response.body.summary).toHaveProperty("activeAccounts");
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });

    it("should return cached data on second request", async () => {
      // First request should cache the data
      const firstResponse = await request(app)
        .get("/api/dashboard/accounts")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Mock a change that shouldn't be reflected due to caching
      mockWorkerManager.getWorkerStatus.mockReturnValue({
        accountId: testAccountId.toString(),
        isConnected: false, // Changed from true to false
        hasError: false,
        uptime: 3600,
        memoryUsage: 100,
        reconnectAttempts: 0,
        lastActivity: new Date(),
      });

      // Second request should return cached data
      const secondResponse = await request(app)
        .get("/api/dashboard/accounts")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Both responses should be identical since the second used cached data
      expect(secondResponse.body).toEqual(firstResponse.body);

      // Verify that cached data was used
      const cacheKey = `dashboard:accounts:${testUser._id}`;
      expect(cache.has(cacheKey)).toBe(true);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/dashboard/accounts").expect(401);
    });
  });

  describe("GET /api/dashboard/activity", () => {
    it("should return activity data", async () => {
      const response = await request(app)
        .get("/api/dashboard/activity")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("activity");
      expect(response.body).toHaveProperty("total");
    });

    it("should accept a limit parameter", async () => {
      const response = await request(app)
        .get("/api/dashboard/activity?limit=5")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("activity");
    });

    it("should use cache for repeated requests", async () => {
      // First request
      await request(app)
        .get("/api/dashboard/activity?limit=10")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Verify cache was set
      const cacheKey = `dashboard:activity:${testUser._id}:10`;
      expect(cache.has(cacheKey)).toBe(true);
    });
  });

  describe("GET /api/dashboard/content", () => {
    it("should return content delivery statistics", async () => {
      const response = await request(app)
        .get("/api/dashboard/content")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("summary");
      expect(response.body).toHaveProperty("daily");
      expect(response.body).toHaveProperty("accounts");
    });

    it("should accept a days parameter", async () => {
      const response = await request(app)
        .get("/api/dashboard/content?days=3")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("summary");
    });

    it("should use cache for repeated requests", async () => {
      // First request
      await request(app)
        .get("/api/dashboard/content?days=7")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Verify cache was set
      const cacheKey = `dashboard:content:${testUser._id}:7`;
      expect(cache.has(cacheKey)).toBe(true);
    });
  });

  describe("GET /api/dashboard/system", () => {
    it("should return system metrics", async () => {
      const response = await request(app)
        .get("/api/dashboard/system")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("current");
      expect(response.body).toHaveProperty("history");
      expect(response.body.current).toHaveProperty("cpu");
      expect(response.body.current).toHaveProperty("memory");
      expect(response.body.current).toHaveProperty("threadCount");
    });

    it("should use cache for repeated requests", async () => {
      // First request
      await request(app)
        .get("/api/dashboard/system")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Verify cache was set
      const cacheKey = `dashboard:system:${testUser._id}`;
      expect(cache.has(cacheKey)).toBe(true);
    });
  });
});
