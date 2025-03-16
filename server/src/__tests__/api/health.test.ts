import request from "supertest";
import app from "../../app";
import { WorkerManager } from "../../workers/WorkerManager";

jest.mock("../../workers/WorkerManager");

describe("Health API", () => {
  let mockWorkerManager: jest.Mocked<WorkerManager>;

  beforeEach(() => {
    mockWorkerManager = WorkerManager.getInstance() as jest.Mocked<WorkerManager>;
    mockWorkerManager.getWorkerCount.mockReturnValue(2);
    mockWorkerManager.getActiveWorkerCount.mockReturnValue(1);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return basic health check", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("GET /api/health/status", () => {
    it("should return detailed status", async () => {
      const response = await request(app).get("/api/health/status");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        uptime: expect.any(Number),
        timestamp: expect.any(Number),
        workers: {
          total: 2,
          active: 1,
        },
        memory: {
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          rss: expect.any(Number),
          external: expect.any(Number),
        },
      });
    });

    it("should reflect worker manager metrics", async () => {
      mockWorkerManager.getWorkerCount.mockReturnValue(5);
      mockWorkerManager.getActiveWorkerCount.mockReturnValue(3);

      const response = await request(app).get("/api/health/status");

      expect(response.status).toBe(200);
      expect(response.body.workers).toEqual({
        total: 5,
        active: 3,
      });
    });
  });
});
