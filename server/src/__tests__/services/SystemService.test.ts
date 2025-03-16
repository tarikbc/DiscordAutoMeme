import { Types } from "mongoose";
import { SystemService } from "../../services/SystemService";
import { SystemMetrics } from "../../models/SystemMetrics";
import { WorkerManager } from "../../workers/WorkerManager";

jest.mock("../../workers/WorkerManager");

describe("SystemService", () => {
  let systemService: SystemService;
  let mockWorkerManager: jest.Mocked<WorkerManager>;

  beforeEach(() => {
    mockWorkerManager = WorkerManager.getInstance() as jest.Mocked<WorkerManager>;
    mockWorkerManager.getMetrics.mockReturnValue({
      threadCount: 2,
      requestsPerMinute: 60,
      errorRate: 0.1,
      presenceUpdatesPerMinute: 30,
      memoryUsage: 100,
      uptime: 3600,
      requestCount: 120,
      errorCount: 2,
    });
    mockWorkerManager.getWorkerStatus.mockReturnValue({
      accountId: "test-account",
      isConnected: true,
      hasError: false,
      uptime: 3600,
      memoryUsage: 100,
    });
    mockWorkerManager.getAllWorkersStatus.mockReturnValue([
      {
        accountId: "test-account-1",
        isConnected: true,
        hasError: false,
        uptime: 3600,
        memoryUsage: 100,
      },
      {
        accountId: "test-account-2",
        isConnected: true,
        hasError: false,
        uptime: 1800,
        memoryUsage: 150,
      },
    ]);

    systemService = SystemService.getInstance();
  });

  afterEach(async () => {
    systemService.stopMetricsCollection();
    await SystemMetrics.deleteMany({});
  });

  describe("Metrics Collection", () => {
    it("should start and stop metrics collection", () => {
      systemService.startMetricsCollection();
      expect(systemService["metricsInterval"]).toBeDefined();

      systemService.stopMetricsCollection();
      expect(systemService["metricsInterval"]).toBeNull();
    });

    it("should collect metrics", async () => {
      await systemService["collectMetrics"]();
      const metrics = await SystemMetrics.findOne().sort({ timestamp: -1 });

      expect(metrics).toBeDefined();
      expect(metrics?.cpuUsage).toBeDefined();
      expect(metrics?.memoryUsage).toHaveProperty("total");
      expect(metrics?.memoryUsage).toHaveProperty("used");
      expect(metrics?.memoryUsage).toHaveProperty("free");
      expect(metrics?.threadCount).toBe(2);
      expect(metrics?.requestsPerMinute).toBe(60);
      expect(metrics?.errorRate).toBe(0.1);
    });
  });

  describe("Metrics Retrieval", () => {
    beforeEach(async () => {
      // Create some test metrics
      const now = new Date();
      await SystemMetrics.create([
        {
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          cpuUsage: 50,
          memoryUsage: { total: 1000, used: 500, free: 500 },
          threadCount: 2,
          activeClients: 2,
          activeUsers: 1,
          requestsPerMinute: 60,
          errorRate: 0.1,
        },
        {
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          cpuUsage: 60,
          memoryUsage: { total: 1000, used: 600, free: 400 },
          threadCount: 2,
          activeClients: 2,
          activeUsers: 1,
          requestsPerMinute: 70,
          errorRate: 0.2,
        },
      ]);
    });

    it("should get latest metrics", async () => {
      const metrics = await systemService.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.cpuUsage).toBe(60);
      expect(metrics?.memoryUsage.used).toBe(600);
    });

    it("should get metrics history", async () => {
      const history = await systemService.getMetricsHistory(3, 30);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("Worker Status", () => {
    it("should get worker status for specific account", () => {
      const accountId = new Types.ObjectId();
      const status = systemService.getWorkerStatus(accountId);

      expect(status).toBeDefined();
      expect(status?.isConnected).toBe(true);
      expect(status?.hasError).toBe(false);
      expect(status?.memoryUsage).toBe(100);
    });

    it("should get all workers status", () => {
      const status = systemService.getAllWorkersStatus();

      expect(Array.isArray(status)).toBe(true);
      expect(status).toHaveLength(2);
      expect(status[0].accountId).toBe("test-account-1");
      expect(status[1].accountId).toBe("test-account-2");
    });
  });

  describe("Health Check", () => {
    it("should get system health check", async () => {
      const health = await systemService.getHealthCheck();

      expect(health.status).toBe("ok");
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.workers).toEqual({
        total: 2,
        active: 2,
        error: 0,
      });
    });
  });

  describe("Dashboard Metrics", () => {
    it("should get comprehensive system metrics for dashboard", async () => {
      // Create a recent metric for testing
      await SystemMetrics.create({
        timestamp: new Date(),
        cpuUsage: 45.5,
        memoryUsage: { total: 1000, used: 400, free: 600 },
        threadCount: 5,
        activeClients: 10,
        activeUsers: 3,
        requestsPerMinute: 120,
        errorRate: 0.5,
      });

      const metrics = await systemService.getSystemMetrics();

      expect(metrics).toHaveProperty("current");
      expect(metrics).toHaveProperty("history");

      // Check current metrics
      expect(metrics.current).toHaveProperty("cpu");
      expect(metrics.current).toHaveProperty("memory");
      expect(metrics.current).toHaveProperty("threadCount");
      expect(metrics.current).toHaveProperty("activeClients");
      expect(metrics.current).toHaveProperty("activeUsers");
      expect(metrics.current).toHaveProperty("requestsPerMinute");
      expect(metrics.current).toHaveProperty("errorRate");

      // Check history is an array
      expect(Array.isArray(metrics.history)).toBe(true);
    });

    it("should handle empty metrics data gracefully", async () => {
      // Ensure no metrics exist
      await SystemMetrics.deleteMany({});

      const metrics = await systemService.getSystemMetrics();

      // Should still return a structured response with default values
      expect(metrics.current.cpu).toBe(0);
      expect(metrics.current.threadCount).toBe(0);
      expect(Array.isArray(metrics.history)).toBe(true);
      expect(metrics.history.length).toBe(0);
    });
  });
});
