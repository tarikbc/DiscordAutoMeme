import os from "os";
import { Types } from "mongoose";
import { SystemMetrics, ISystemMetrics } from "../models/SystemMetrics";
import { WorkerManager } from "../workers/WorkerManager";
import { DiscordAccount } from "../models/DiscordAccount";
import logger from "../utils/logger";

export interface WorkerStatus {
  accountId: string;
  isConnected: boolean;
  hasError: boolean;
  lastError?: string;
  uptime?: number;
  memoryUsage?: number;
  reconnectAttempts?: number;
  lastActivity?: Date;
}

export class SystemService {
  private static instance: SystemService;
  private workerManager: WorkerManager;
  private metricsInterval: NodeJS.Timeout | null = null;
  private readonly METRICS_COLLECTION_INTERVAL = 60000; // 1 minute

  private constructor() {
    this.workerManager = WorkerManager.getInstance();
  }

  public static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }
    return SystemService.instance;
  }

  /**
   * Start collecting system metrics
   */
  startMetricsCollection(): void {
    if (this.metricsInterval) {
      return;
    }

    this.metricsInterval = setInterval(
      () => this.collectMetrics(),
      this.METRICS_COLLECTION_INTERVAL,
    );

    logger.info("Started system metrics collection");
  }

  /**
   * Stop collecting system metrics
   */
  stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      logger.info("Stopped system metrics collection");
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const cpus = os.cpus();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // Calculate CPU usage
      const cpuUsage =
        cpus.reduce((acc, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b);
          const idle = cpu.times.idle;
          return acc + ((total - idle) / total) * 100;
        }, 0) / cpus.length;

      // Get active clients and users count
      const [activeClients, activeUsers] = await Promise.all([
        DiscordAccount.countDocuments({ isActive: true }).exec(),
        DiscordAccount.distinct("userId", { isActive: true }).then(ids => ids.length),
      ]);

      // Get worker thread metrics
      const workerMetrics = this.workerManager.getMetrics();

      const metrics: Omit<ISystemMetrics, "_id"> = {
        timestamp: new Date(),
        cpuUsage,
        memoryUsage: {
          total: Math.round(totalMemory / 1024 / 1024), // Convert to MB
          used: Math.round(usedMemory / 1024 / 1024),
          free: Math.round(freeMemory / 1024 / 1024),
        },
        threadCount: workerMetrics.threadCount,
        activeClients,
        activeUsers,
        requestsPerMinute: workerMetrics.requestsPerMinute,
        errorRate: workerMetrics.errorRate,
      };

      await SystemMetrics.create(metrics);
      logger.debug("Collected system metrics");
    } catch (error) {
      logger.error("Error collecting system metrics:", error);
    }
  }

  /**
   * Get latest system metrics
   */
  getLatestMetrics(): Promise<ISystemMetrics | null> {
    return SystemMetrics.findOne().sort({ timestamp: -1 }).exec();
  }

  /**
   * Get system metrics history
   */
  getMetricsHistory(
    hours = 24,
    interval = 5, // minutes
  ): Promise<ISystemMetrics[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return SystemMetrics.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: "$timestamp" },
                { $mod: [{ $toLong: "$timestamp" }, interval * 60 * 1000] },
              ],
            },
          },
          cpuUsage: { $avg: "$cpuUsage" },
          memoryUsage: { $last: "$memoryUsage" },
          threadCount: { $avg: "$threadCount" },
          activeClients: { $avg: "$activeClients" },
          activeUsers: { $avg: "$activeUsers" },
          requestsPerMinute: { $avg: "$requestsPerMinute" },
          errorRate: { $avg: "$errorRate" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  /**
   * Get worker thread status
   */
  getWorkerStatus(accountId: Types.ObjectId): WorkerStatus | null {
    return this.workerManager.getWorkerStatus(accountId.toString());
  }

  /**
   * Alias for getWorkerStatus (for backward compatibility)
   */
  getAccountStatus(accountId: Types.ObjectId): WorkerStatus | null {
    return this.getWorkerStatus(accountId);
  }

  /**
   * Get all worker threads status
   */
  getAllWorkersStatus(): WorkerStatus[] {
    return this.workerManager.getAllWorkersStatus();
  }

  /**
   * Get system health check
   */
  async getHealthCheck() {
    const metrics = await this.getLatestMetrics();
    const workersStatus = this.getAllWorkersStatus();
    const activeWorkers = workersStatus.filter(w => w.isConnected);
    const errorWorkers = workersStatus.filter(w => w.hasError);

    const averageUptime =
      activeWorkers.map(w => w.uptime || 0).reduce((a, b) => a + b, 0) /
      (activeWorkers.length || 1);

    const averageMemoryUsage =
      activeWorkers.map(w => w.memoryUsage || 0).reduce((a, b) => a + b, 0) /
      (activeWorkers.length || 1);

    return {
      status: "ok",
      timestamp: new Date(),
      uptime: process.uptime(),
      metrics: metrics
        ? {
            cpuUsage: metrics.cpuUsage,
            memoryUsage: metrics.memoryUsage,
            threadCount: metrics.threadCount,
            activeClients: metrics.activeClients,
            errorRate: metrics.errorRate,
            averageWorkerUptime: averageUptime,
            averageWorkerMemoryUsage: averageMemoryUsage,
          }
        : null,
      workers: {
        total: workersStatus.length,
        active: activeWorkers.length,
        error: errorWorkers.length,
      },
    };
  }

  /**
   * Get comprehensive system metrics for dashboard
   */
  async getSystemMetrics(): Promise<any> {
    try {
      // Get the latest metrics
      const metrics = await this.getLatestMetrics();

      // Get metrics history for the last 12 hours
      const usageHistory = await this.getMetricsHistory(12);

      return {
        current: {
          cpu: metrics?.cpuUsage || 0,
          memory: metrics?.memoryUsage || 0,
          threadCount: metrics?.threadCount || 0,
          activeClients: metrics?.activeClients || 0,
          activeUsers: metrics?.activeUsers || 0,
          requestsPerMinute: metrics?.requestsPerMinute || 0,
          errorRate: metrics?.errorRate || 0,
        },
        history: usageHistory.map(point => ({
          timestamp: point.timestamp,
          cpu: point.cpuUsage,
          memory: point.memoryUsage,
        })),
      };
    } catch (error) {
      logger.error("Error getting system metrics:", error);
      throw error;
    }
  }
}
