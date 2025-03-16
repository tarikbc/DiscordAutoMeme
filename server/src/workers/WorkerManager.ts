import { Worker } from "worker_threads";
import path from "path";
import { EventEmitter } from "events";
import logger from "../utils/logger";
import { WorkerMessage, WorkerResponse } from "../types/worker";
import { IDiscordAccount } from "../models";
import { Document } from "mongoose";
import { decryptToken } from "../utils/encryption";

interface WorkerMetrics {
  threadCount: number;
  requestsPerMinute: number;
  errorRate: number;
  presenceUpdatesPerMinute: number;
  memoryUsage: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
}

interface WorkerStatus {
  accountId: string;
  isConnected: boolean;
  hasError: boolean;
  lastError?: string;
  uptime: number;
  memoryUsage: number;
  reconnectAttempts?: number;
  lastActivity?: Date;
}

interface ManagerWorkerStatus extends Omit<WorkerStatus, "uptime" | "memoryUsage"> {
  accountId: string;
  lastActivity?: Date;
  uptime?: number;
  memoryUsage?: number;
}

export class WorkerManager extends EventEmitter {
  private workers: Map<string, Worker>;
  private workerStatus: Map<string, ManagerWorkerStatus>;
  private static instance: WorkerManager;
  private metrics: {
    requests: number;
    errors: number;
    presenceUpdates: number;
    lastReset: Date;
  } = {
    requests: 0,
    errors: 0,
    presenceUpdates: 0,
    lastReset: new Date(),
  };

  private constructor() {
    super();
    this.workers = new Map();
    this.workerStatus = new Map();
    // Reset metrics every minute
    setInterval(() => this.resetMetrics(), 60000);
  }

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  public startWorker(
    account: Document<unknown, Record<string, never>, IDiscordAccount> & IDiscordAccount,
  ): void {
    const accountId = account._id.toString();

    if (this.workers.has(accountId)) {
      logger.warn(`Worker for account ${accountId} already exists`);
      return;
    }

    try {
      const token = decryptToken(account.token);

      // Initialize worker status
      this.workerStatus.set(accountId, {
        accountId,
        isConnected: false,
        hasError: false,
        uptime: 0,
        memoryUsage: 0,
        reconnectAttempts: 0,
        lastActivity: new Date(),
      });

      const worker = new Worker(path.join(__dirname, "DiscordWorker.js"), {
        workerData: {
          accountId,
          token,
          settings: account.settings,
        },
      });

      this.setupWorkerEventHandlers(worker, accountId);
      this.workers.set(accountId, worker);

      // Send START message to worker
      worker.postMessage({ type: "START" });

      logger.info(`Started worker for account ${accountId}`);
    } catch (error) {
      logger.error(`Failed to start worker for account ${accountId}:`, error);
      throw error;
    }
  }

  public async stopWorker(accountId: string): Promise<void> {
    const worker = this.workers.get(accountId);
    if (!worker) {
      logger.warn(`No worker found for account ${accountId}`);
      return;
    }

    try {
      const message: WorkerMessage = {
        type: "STOP",
        data: { accountId },
      };
      worker.postMessage(message);

      // Wait for worker to terminate
      await new Promise<void>((resolve, reject) => {
        worker.once("exit", code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });

      this.workers.delete(accountId);
      this.workerStatus.delete(accountId);
      logger.info(`Stopped worker for account ${accountId}`);
    } catch (error) {
      logger.error(`Failed to stop worker for account ${accountId}:`, error);
      throw error;
    }
  }

  public updateWorkerSettings(
    account: Document<unknown, Record<string, never>, IDiscordAccount> & IDiscordAccount,
    settings: IDiscordAccount["settings"],
  ): void {
    const accountId = account._id.toString();
    const worker = this.workers.get(accountId);

    if (!worker) {
      logger.warn(`No worker found for account ${accountId}`);
      return;
    }

    try {
      const message: WorkerMessage = {
        type: "UPDATE_SETTINGS",
        data: { accountId, settings },
      };
      worker.postMessage(message);
      logger.info(`Updated settings for worker ${accountId}`);
    } catch (error) {
      logger.error(`Failed to update settings for worker ${accountId}:`, error);
      throw error;
    }
  }

  private setupWorkerEventHandlers(worker: Worker, accountId: string): void {
    worker.on("message", (response: WorkerResponse) => {
      this.metrics.requests++;
      this.emit("worker:message", response);

      // Update last activity timestamp
      const status = this.workerStatus.get(accountId);
      if (status) {
        status.lastActivity = new Date();
      }

      // Handle different response types
      switch (response.type) {
        case "STATUS":
          if (response.data.status) {
            const newStatus: ManagerWorkerStatus = {
              ...response.data.status,
              accountId,
              lastActivity: new Date(),
              hasError: false,
            };
            this.workerStatus.set(accountId, newStatus);
          }
          this.emit("worker:status", response.data);
          break;

        case "ERROR":
          this.metrics.errors++;
          if (response.data.error) {
            const errorStatus = this.workerStatus.get(accountId);
            if (errorStatus) {
              errorStatus.hasError = true;
              errorStatus.lastError = response.data.error.message;
              this.workerStatus.set(accountId, errorStatus);
            }
          }
          logger.error(`Worker ${accountId} error:`, response.data.error);
          this.emit("worker:error", response.data);
          break;

        case "PRESENCE_UPDATE":
          this.metrics.presenceUpdates++;
          this.emit("worker:presence", response.data);
          break;

        case "METRICS":
          if (response.data.metrics) {
            const metricsStatus = this.workerStatus.get(accountId);
            if (metricsStatus) {
              metricsStatus.memoryUsage = response.data.metrics.memoryUsage;
              metricsStatus.uptime = response.data.metrics.uptime;
              this.workerStatus.set(accountId, metricsStatus);
            }
          }
          this.emit("worker:metrics", response.data);
          break;
      }
    });

    worker.on("error", error => {
      this.metrics.errors++;
      const status = this.workerStatus.get(accountId);
      if (status) {
        status.hasError = true;
        status.lastError = error.message;
        this.workerStatus.set(accountId, status);
      }

      logger.error(`Worker ${accountId} error:`, error);
      this.emit("worker:error", {
        accountId,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    });

    worker.on("exit", code => {
      if (code !== 0) {
        logger.error(`Worker ${accountId} stopped with exit code ${code}`);
        this.metrics.errors++;
      }
      this.workers.delete(accountId);
      this.workerStatus.delete(accountId);
      this.emit("worker:exit", { accountId, code });
    });
  }

  public async stopAllWorkers(): Promise<void> {
    const stopPromises = Array.from(this.workers.keys()).map(accountId =>
      this.stopWorker(accountId),
    );

    try {
      await Promise.all(stopPromises);
      logger.info("All workers stopped");
    } catch (error) {
      logger.error("Error stopping all workers:", error);
      throw error;
    }
  }

  public getActiveWorkerCount(): number {
    return Array.from(this.workers.values()).filter(
      worker => worker.threadId !== 0, // threadId is 0 when worker is terminated
    ).length;
  }

  public getWorkerCount(): number {
    return this.workers.size;
  }

  /**
   * Get worker status
   */
  getWorkerStatus(accountId: string): ManagerWorkerStatus | null {
    return this.workerStatus.get(accountId) || null;
  }

  /**
   * Get all workers status
   */
  getAllWorkersStatus(): ManagerWorkerStatus[] {
    return Array.from(this.workerStatus.values());
  }

  /**
   * Get worker metrics
   */
  getMetrics(): WorkerMetrics {
    const minutesSinceReset = (Date.now() - this.metrics.lastReset.getTime()) / 1000 / 60;

    return {
      threadCount: this.workers.size,
      requestsPerMinute: Math.round(this.metrics.requests / minutesSinceReset),
      errorRate: Math.round(this.metrics.errors / minutesSinceReset),
      presenceUpdatesPerMinute: Math.round(this.metrics.presenceUpdates / minutesSinceReset),
      memoryUsage: Array.from(this.workerStatus.values()).reduce(
        (total, status) => total + (status.memoryUsage || 0),
        0,
      ),
      uptime: process.uptime(),
      requestCount: this.metrics.requests,
      errorCount: this.metrics.errors,
    };
  }

  /**
   * Reset metrics counters
   */
  private resetMetrics(): void {
    this.metrics = {
      requests: 0,
      errors: 0,
      presenceUpdates: 0,
      lastReset: new Date(),
    };
  }

  public sendToWorker(accountId: string, message: WorkerMessage): void {
    const worker = this.workers.get(accountId);
    if (!worker) {
      throw new Error(`No worker found for account ${accountId}`);
    }

    worker.postMessage(message);
  }

  /**
   * Get a worker by ID
   * @param workerId The ID of the worker to retrieve
   * @returns The worker instance or undefined if not found
   */
  getWorker(workerId: string): Worker | undefined {
    return this.workers.get(workerId);
  }
}
