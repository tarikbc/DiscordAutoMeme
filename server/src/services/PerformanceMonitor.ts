import si from "systeminformation";
import os from "os";
import logger from "../utils/logger";

/**
 * SystemMetrics interface for performance data
 */
export interface SystemMetrics {
  // CPU metrics
  cpuUsage: number;
  cpuTemp: number;
  cpuCores: number;

  // Memory metrics
  memoryUsage: number;
  memoryFree: number;
  memoryTotal: number;

  // System metrics
  uptime: number;
  loadAverage: number[];

  // Network metrics
  networkRx: number;
  networkTx: number;
  networkRxSec: number;
  networkTxSec: number;

  // Disk metrics
  diskUsage: number;
  diskFree: number;
  diskTotal: number;

  // Timestamp
  timestamp: string;
}

type MetricsListener = (metrics: SystemMetrics) => void;

/**
 * Performance monitoring service
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private updateInterval: NodeJS.Timeout | null = null;
  private intervalTime = 5000; // Default update interval: 5 seconds
  private listeners: MetricsListener[] = [];
  private metrics: SystemMetrics;

  // For calculating network speed
  private lastNetworkStats: {
    rx: number;
    tx: number;
    timestamp: number;
  } | null = null;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.metrics = this.getEmptyMetrics();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring with the specified interval
   */
  public start(interval?: number): void {
    if (this.updateInterval) {
      this.stop();
    }

    this.intervalTime = interval || this.intervalTime;

    // Initialize metrics immediately
    this.updateMetrics();

    // Set up the update interval
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, this.intervalTime);

    logger.info(`Performance monitor started with ${this.intervalTime}ms interval`);
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info("Performance monitor stopped");
    }
  }

  /**
   * Add a listener for metrics updates
   */
  public addListener(listener: MetricsListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   */
  public removeListener(listener: MetricsListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get the current metrics
   */
  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Update metrics by querying the system
   */
  private async updateMetrics(): Promise<void> {
    try {
      // CPU data
      const cpuData = await si.currentLoad();
      const cpuTemp = await si.cpuTemperature();

      // Memory data
      const memData = await si.mem();

      // Network data
      const networkStats = await si.networkStats();
      const networkInterfaces = await si.networkInterfaces();

      // Get primary network interface (typically the first active one)
      let primaryInterface: si.Systeminformation.NetworkInterfacesData;

      if (Array.isArray(networkInterfaces)) {
        primaryInterface =
          networkInterfaces.find(iface => iface.operstate === "up" && !iface.internal) ||
          networkInterfaces[0];
      } else {
        primaryInterface = networkInterfaces;
      }

      // Find network stats for the primary interface
      let primaryNetworkStats: si.Systeminformation.NetworkStatsData;

      if (Array.isArray(networkStats)) {
        primaryNetworkStats =
          networkStats.find(stats => stats.iface === primaryInterface?.iface) || networkStats[0];
      } else {
        primaryNetworkStats = networkStats;
      }

      // Calculate network speeds if we have previous measurements
      const networkSpeeds = this.calculateNetworkSpeeds(
        primaryNetworkStats.rx_bytes,
        primaryNetworkStats.tx_bytes,
      );

      // Disk data
      const fsSize = await si.fsSize();
      let mainDisk: si.Systeminformation.FsSizeData;

      if (Array.isArray(fsSize)) {
        mainDisk = fsSize.find(fs => fs.mount === "/") || fsSize[0];
      } else {
        mainDisk = fsSize;
      }

      // Update metrics
      this.metrics = {
        // CPU metrics
        cpuUsage: Math.round(cpuData.currentLoad),
        cpuTemp: Math.round(cpuTemp.main || cpuTemp.cores?.[0] || 0),
        cpuCores: os.cpus().length,

        // Memory metrics
        memoryUsage: Math.round((memData.used / memData.total) * 100),
        memoryFree: Math.round((memData.free / (1024 * 1024 * 1024)) * 100) / 100, // GB with 2 decimal places
        memoryTotal: Math.round((memData.total / (1024 * 1024 * 1024)) * 100) / 100, // GB with 2 decimal places

        // System metrics
        uptime: os.uptime(),
        loadAverage: os.loadavg(),

        // Network metrics
        networkRx: primaryNetworkStats.rx_bytes,
        networkTx: primaryNetworkStats.tx_bytes,
        networkRxSec: networkSpeeds.rxSpeed,
        networkTxSec: networkSpeeds.txSpeed,

        // Disk metrics
        diskUsage: Math.round((mainDisk.used / mainDisk.size) * 100),
        diskFree: Math.round((mainDisk.available / (1024 * 1024 * 1024)) * 100) / 100, // GB with 2 decimal places
        diskTotal: Math.round((mainDisk.size / (1024 * 1024 * 1024)) * 100) / 100, // GB with 2 decimal places

        // Timestamp
        timestamp: new Date().toISOString(),
      };

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      logger.error("Error updating performance metrics:", error);
    }
  }

  /**
   * Calculate network speeds based on previous measurements
   */
  private calculateNetworkSpeeds(
    rxBytes: number,
    txBytes: number,
  ): { rxSpeed: number; txSpeed: number } {
    const now = Date.now();

    if (!this.lastNetworkStats) {
      this.lastNetworkStats = {
        rx: rxBytes,
        tx: txBytes,
        timestamp: now,
      };
      return { rxSpeed: 0, txSpeed: 0 };
    }

    const timeDiff = (now - this.lastNetworkStats.timestamp) / 1000; // in seconds

    if (timeDiff <= 0) {
      return { rxSpeed: 0, txSpeed: 0 };
    }

    // Calculate bytes per second
    const rxSpeed = Math.round((rxBytes - this.lastNetworkStats.rx) / timeDiff);
    const txSpeed = Math.round((txBytes - this.lastNetworkStats.tx) / timeDiff);

    // Update last values
    this.lastNetworkStats = {
      rx: rxBytes,
      tx: txBytes,
      timestamp: now,
    };

    return {
      rxSpeed: rxSpeed > 0 ? rxSpeed : 0,
      txSpeed: txSpeed > 0 ? txSpeed : 0,
    };
  }

  /**
   * Notify all listeners of the updated metrics
   */
  private notifyListeners(): void {
    const metricsSnapshot = { ...this.metrics };
    this.listeners.forEach(listener => {
      try {
        listener(metricsSnapshot);
      } catch (error) {
        logger.error("Error in metrics listener:", error);
      }
    });
  }

  /**
   * Get empty metrics object with default values
   */
  private getEmptyMetrics(): SystemMetrics {
    return {
      cpuUsage: 0,
      cpuTemp: 0,
      cpuCores: os.cpus().length,
      memoryUsage: 0,
      memoryFree: 0,
      memoryTotal: 0,
      uptime: 0,
      loadAverage: [0, 0, 0],
      networkRx: 0,
      networkTx: 0,
      networkRxSec: 0,
      networkTxSec: 0,
      diskUsage: 0,
      diskFree: 0,
      diskTotal: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export default PerformanceMonitor.getInstance();
