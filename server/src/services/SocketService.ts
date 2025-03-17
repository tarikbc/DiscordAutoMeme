import { Server as SocketServer } from "socket.io";
import { Server } from "http";
import logger from "../utils/logger";
import config from "../config";
import fs from "fs";
import readline from "readline";
import path from "path";
import performanceMonitor, { SystemMetrics } from "./PerformanceMonitor";
import PerformanceAlertConfig, { getDefaultAlertConfig } from "../models/PerformanceAlertConfig";
import { decryptToken } from "../utils/encryption";

/**
 * Log entry structure for client consumption
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  component: string;
  message: string;
  details?: string;
}

// Interface for performance alert config - matches the model
interface PerformanceAlertConfig {
  userId: string;
  enabled: boolean;
  triggers: {
    [metricId: string]: boolean;
  };
  thresholds: {
    [metricId: string]: number;
  };
}

/**
 * Service class to manage Socket.io connections and events
 */
class SocketService {
  private static instance: SocketService;
  private io: SocketServer | null = null;
  private connectedClients: Set<string> = new Set();
  // Track admin clients that want to receive logs
  private logSubscribers: Set<string> = new Set();
  // Track clients that want to receive performance metrics
  private performanceSubscribers: Set<string> = new Set();

  // Default allowed origins for CORS
  private allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

  // Log files path
  private logsDir = path.join(__dirname, "../../../logs");

  // In-memory cache of recent logs for new connections
  private recentLogs: LogEntry[] = [];
  private readonly MAX_RECENT_LOGS = 100;

  // Latest system metrics
  private latestSystemMetrics: SystemMetrics | null = null;

  // Add a map to store alert configurations per user
  private performanceAlertConfigs: Map<string, PerformanceAlertConfig> = new Map();

  // Keep a mapping of socketId to userId for authentication
  private userMapping: Map<string, string> = new Map();

  // Add a cache for default alert configurations
  private defaultAlertConfigCache: Map<string, PerformanceAlertConfig> = new Map();

  /**
   * Get singleton instance
   */
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize Socket.io server
   */
  public initialize(server: Server): void {
    if (this.io) {
      logger.warn("Socket.io server already initialized");
      return;
    }

    // Add the current environment's hostname if in production
    if (config.env === "production") {
      const prodHostname = process.env.CLIENT_URL || "https://discordautomeme.com";
      this.allowedOrigins.push(prodHostname);
    }

    this.io = new SocketServer(server, {
      cors: {
        origin: this.allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    logger.info("Socket.io server initialized");

    // Start the performance monitor
    performanceMonitor.start(3000); // Update every 3 seconds

    // Register listener for performance updates
    performanceMonitor.addListener(metrics => {
      this.latestSystemMetrics = metrics;
      this.emitPerformanceMetrics(metrics);
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", socket => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial system status
      if (this.latestSystemMetrics) {
        socket.emit("system_status", this.latestSystemMetrics);
      } else {
        socket.emit("system_status", performanceMonitor.getMetrics());
      }

      // Handle logs subscription
      socket.on("subscribe_logs", (payload, callback) => {
        try {
          const { isAdmin } = payload || {};

          // Only allow admins to subscribe to logs
          if (isAdmin) {
            this.logSubscribers.add(socket.id);
            logger.info(`Admin client ${socket.id} subscribed to logs`);

            // Send initial logs if available
            if (this.recentLogs.length > 0) {
              socket.emit("logs_data", { logs: this.recentLogs });
            }

            if (typeof callback === "function") {
              callback({ success: true });
            }
          } else {
            logger.warn(`Client ${socket.id} attempted to subscribe to logs but is not an admin`);
            if (typeof callback === "function") {
              callback({ success: false, error: "Unauthorized access" });
            }
          }
        } catch (error) {
          logger.error(`Error handling log subscription for client ${socket.id}:`, error);
          if (typeof callback === "function") {
            callback({ success: false, error: "Internal server error" });
          }
        }
      });

      // Handle logs unsubscription
      socket.on("unsubscribe_logs", (_payload, callback) => {
        this.logSubscribers.delete(socket.id);
        logger.info(`Client ${socket.id} unsubscribed from logs`);

        // Send acknowledgement if callback provided
        if (typeof callback === "function") {
          callback({ success: true });
        }
      });

      // Handle performance metrics subscription
      socket.on("subscribe_performance", (payload, callback) => {
        try {
          this.performanceSubscribers.add(socket.id);
          logger.info(`Client ${socket.id} subscribed to performance metrics`);

          // Send latest metrics immediately if available
          if (this.latestSystemMetrics) {
            socket.emit("performance_metrics", this.latestSystemMetrics);
          }

          if (typeof callback === "function") {
            callback({ success: true });
          }
        } catch (error) {
          logger.error(`Error handling performance subscription for client ${socket.id}:`, error);
          if (typeof callback === "function") {
            callback({ success: false, error: "Internal server error" });
          }
        }
      });

      // Handle performance metrics unsubscription
      socket.on("unsubscribe_performance", (_payload, callback) => {
        this.performanceSubscribers.delete(socket.id);
        logger.info(`Client ${socket.id} unsubscribed from performance metrics`);

        if (typeof callback === "function") {
          callback({ success: true });
        }
      });

      // Handle logs request
      socket.on("fetch_logs", async (filters, callback) => {
        try {
          logger.info(`Client ${socket.id} requested logs with filters:`, filters);
          const logs = await this.fetchLogs(filters);

          if (typeof callback === "function") {
            callback({ success: true, logs });
          } else {
            socket.emit("logs_data", { logs });
          }
        } catch (error) {
          logger.error(`Error fetching logs for client ${socket.id}:`, error);
          if (typeof callback === "function") {
            callback({ success: false, error: "Failed to fetch logs" });
          } else {
            socket.emit("logs_error", { error: "Failed to fetch logs" });
          }
        }
      });

      // Handle authentication
      socket.on("authenticate", (authData, callback) => {
        logger.info(`Client ${socket.id} authenticating...`);

        try {
          // Extract token and userId from auth data
          const token = typeof authData === "string" ? authData : authData?.token;
          let userId = typeof authData === "object" ? authData?.userId : null;

          if (!token) {
            if (typeof callback === "function") {
              callback({ success: false, error: "Missing token" });
            }
            return;
          }

          // If userId not explicitly provided in auth data, extract from token
          if (!userId) {
            userId = this.extractUserIdFromToken(token);
          }

          if (userId) {
            // Store the mapping of socket ID to user ID
            this.userMapping.set(socket.id, userId);
            logger.info(`Client ${socket.id} authenticated as user ${userId}`);

            // Load user's performance alert configuration
            this.loadUserAlertConfig(socket.id, userId)
              .then(() => {
                if (typeof callback === "function") {
                  callback({ success: true });
                }
              })
              .catch(error => {
                logger.error(`Error loading alert config for user ${userId}:`, error);
                if (typeof callback === "function") {
                  callback({ success: true }); // Still return success, just use defaults
                }
              });
          } else {
            if (typeof callback === "function") {
              callback({ success: false, error: "Invalid token" });
            }
            socket.disconnect();
          }
        } catch (error) {
          logger.error(`Authentication error for client ${socket.id}:`, error);
          if (typeof callback === "function") {
            callback({ success: false, error: "Authentication error" });
          }
          socket.disconnect();
        }
      });

      // Handle performance alerts configuration
      socket.on("get_performance_alerts", (_data, callback) => {
        try {
          const userId = this.userMapping.get(socket.id);
          if (!userId) {
            logger.warn(`Unauthenticated client ${socket.id} requested performance alerts`);
            if (typeof callback === "function") {
              callback({ success: false, error: "Authentication required" });
            }
            return;
          }

          const config = this.performanceAlertConfigs.get(socket.id);

          if (typeof callback === "function") {
            callback({ success: true, config });
          }
        } catch (error) {
          logger.error(`Error handling get_performance_alerts for client ${socket.id}:`, error);
          if (typeof callback === "function") {
            callback({ success: false, error: "Internal server error" });
          }
        }
      });

      // Update set_performance_alerts to save to database
      socket.on("set_performance_alerts", async (config: PerformanceAlertConfig, callback) => {
        try {
          // Get userId from socket mapping first
          const userId = this.userMapping.get(socket.id);

          if (!userId) {
            logger.warn(`Unauthenticated client ${socket.id} tried to set performance alerts`);
            if (typeof callback === "function") {
              callback({ success: false, error: "Authentication required" });
            }
            return;
          }

          logger.info(
            `Client ${socket.id} (user ${userId}) setting performance alert configuration`,
          );

          // Always ensure the userId in the config is the correct one from our mapping
          const configWithUser = {
            ...config,
            userId, // Replace any provided userId with the correct one
            updatedAt: new Date(),
          };

          // Store in memory
          this.performanceAlertConfigs.set(socket.id, configWithUser);

          // Save to database
          await this.saveAlertConfigToDb(configWithUser);

          if (typeof callback === "function") {
            callback({ success: true });
          }
        } catch (error) {
          logger.error(`Error handling set_performance_alerts for client ${socket.id}:`, error);
          if (typeof callback === "function") {
            callback({ success: false, error: "Internal server error" });
          }
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
        this.logSubscribers.delete(socket.id);
        this.performanceSubscribers.delete(socket.id);
        this.performanceAlertConfigs.delete(socket.id);
        this.userMapping.delete(socket.id);
      });
    });

    // Start system alert generation
    this.startPeriodicAlerts();
  }

  /**
   * Emit logs to subscribed clients
   * Used by the Winston Socket transport
   */
  public emitLogs(logs: LogEntry[]): void {
    if (!this.io || this.logSubscribers.size === 0) return;

    logger.debug(`Emitting ${logs.length} logs to ${this.logSubscribers.size} subscribers`);

    // Add to recent logs cache (for new connections)
    logs.forEach(log => {
      this.recentLogs.unshift(log);
      // Trim if exceeded max size
      if (this.recentLogs.length > this.MAX_RECENT_LOGS) {
        this.recentLogs.pop();
      }
    });

    // Only emit to clients who have subscribed to logs
    this.logSubscribers.forEach(clientId => {
      const socket = this.io?.sockets.sockets.get(clientId);
      if (socket && socket.connected) {
        logger.debug(`Emitting ${logs.length} logs to client ${clientId}`);
        socket.emit("log_stream", logs);
      } else {
        // Remove stale subscribers
        logger.warn(`Removing stale log subscriber: ${clientId}`);
        this.logSubscribers.delete(clientId);
      }
    });
  }

  /**
   * Emit performance metrics to subscribed clients
   */
  private emitPerformanceMetrics(metrics: SystemMetrics): void {
    if (!this.io || this.performanceSubscribers.size === 0) return;

    logger.debug(`Emitting performance metrics to ${this.performanceSubscribers.size} subscribers`);

    // Only emit to clients who have subscribed to performance metrics
    this.performanceSubscribers.forEach(clientId => {
      const socket = this.io?.sockets.sockets.get(clientId);
      if (socket && socket.connected) {
        socket.emit("performance_metrics", metrics);
      } else {
        // Remove stale subscribers
        logger.debug(`Removing stale performance subscriber: ${clientId}`);
        this.performanceSubscribers.delete(clientId);
      }
    });
  }

  /**
   * Start sending periodic system alerts
   */
  private startPeriodicAlerts(): void {
    // System alerts based on real metrics every 30 seconds
    setInterval(() => {
      if (this.connectedClients.size > 0 && this.io && this.latestSystemMetrics) {
        const metrics = this.latestSystemMetrics;

        // Send alerts to each client based on their configuration
        this.connectedClients.forEach(clientId => {
          const socket = this.io?.sockets.sockets.get(clientId);
          const config = this.performanceAlertConfigs.get(clientId) || this.getDefaultAlertConfig();

          // Only send alerts if enabled in the client's config
          if (!config.enabled) return;

          // Only send to connected clients
          if (!socket || !socket.connected) return;

          // Check for high CPU usage if enabled for this client
          if (config.triggers.cpu && metrics.cpuUsage > config.thresholds.cpuWarning) {
            const alert = this.generateCpuAlert(metrics.cpuUsage, config);
            socket.emit("system_alert", alert);
            logger.warn(`High CPU alert for client ${clientId}: ${metrics.cpuUsage}%`);
          }

          // Check for high memory usage if enabled for this client
          if (config.triggers.memory && metrics.memoryUsage > config.thresholds.memoryWarning) {
            const alert = this.generateMemoryAlert(metrics.memoryUsage, config);
            socket.emit("system_alert", alert);
            logger.warn(`High memory alert for client ${clientId}: ${metrics.memoryUsage}%`);
          }

          // Check for high load average if enabled for this client
          if (config.triggers.load && metrics.loadAverage[0] > config.thresholds.loadWarning) {
            const alert = this.generateLoadAlert(metrics.loadAverage[0], config);
            socket.emit("system_alert", alert);
            logger.warn(
              `High load average alert for client ${clientId}: ${metrics.loadAverage[0]}`,
            );
          }
        });
      }
    }, 30000);
  }

  /**
   * Fetch logs from the log files
   */
  private async fetchLogs(filters: {
    level?: "info" | "warning" | "error" | "debug" | "all";
    component?: string;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    limit?: number;
  }) {
    try {
      const logFiles = ["combined.log", "error.log"];
      const logs: LogEntry[] = [];
      const limit = filters.limit || 200;

      // Check if logs directory exists
      if (!fs.existsSync(this.logsDir)) {
        logger.warn(`Logs directory does not exist: ${this.logsDir}, creating it...`);
        try {
          fs.mkdirSync(this.logsDir, { recursive: true });
        } catch (err) {
          logger.error(`Failed to create logs directory: ${this.logsDir}`, err);
        }
      }

      // Process each log file
      for (const file of logFiles) {
        const filePath = path.join(this.logsDir, file);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
          logger.warn(`Log file does not exist: ${filePath}`);
          continue;
        }

        // Read the log file line by line
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        for await (const line of rl) {
          try {
            // Parse the JSON log entry
            const logEntry = JSON.parse(line);

            // Convert to the client-expected format
            const log = {
              id: logEntry.timestamp || new Date().toISOString(),
              timestamp: logEntry.timestamp || new Date().toISOString(),
              level: logEntry.level || "info",
              component: logEntry.service || logEntry.component || "system",
              message: logEntry.message || "",
              details: logEntry.stack || logEntry.details || JSON.stringify(logEntry, null, 2),
            };

            // Apply filters
            if (filters.level && filters.level !== "all" && log.level !== filters.level) {
              continue;
            }

            if (
              filters.component &&
              filters.component !== "all" &&
              log.component !== filters.component
            ) {
              continue;
            }

            if (filters.startDate) {
              const startDate = new Date(filters.startDate);
              startDate.setHours(0, 0, 0, 0);
              if (new Date(log.timestamp) < startDate) {
                continue;
              }
            }

            if (filters.endDate) {
              const endDate = new Date(filters.endDate);
              endDate.setHours(23, 59, 59, 999);
              if (new Date(log.timestamp) > endDate) {
                continue;
              }
            }

            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              if (
                !log.message.toLowerCase().includes(query) &&
                !(log.details && log.details.toLowerCase().includes(query))
              ) {
                continue;
              }
            }

            logs.push(log);

            // Stop if we've reached the limit
            if (logs.length >= limit) {
              break;
            }
          } catch (err) {
            logger.error("Error parsing log line:", err);
            // Skip this line and continue
          }
        }

        // Close the file stream
        fileStream.close();

        // Stop if we've reached the limit
        if (logs.length >= limit) {
          break;
        }
      }

      // Sort logs by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Extract available components for filtering
      const components = [...new Set(logs.map(log => log.component))];

      return {
        logs,
        components,
        total: logs.length,
      };
    } catch (error) {
      logger.error("Error fetching logs:", error);
      throw error;
    }
  }

  /**
   * Get default alert configuration
   */
  private getDefaultAlertConfig(): PerformanceAlertConfig {
    return getDefaultAlertConfig("") as PerformanceAlertConfig;
  }

  /**
   * Get cached default alert configuration for a specific user
   * This reduces redundant object creation
   */
  private getCachedDefaultAlertConfig(userId: string): PerformanceAlertConfig {
    if (!this.defaultAlertConfigCache.has(userId)) {
      const defaultConfig = getDefaultAlertConfig(userId) as PerformanceAlertConfig;
      this.defaultAlertConfigCache.set(userId, defaultConfig);
    }
    return this.defaultAlertConfigCache.get(userId)!;
  }

  /**
   * Generate CPU usage alert
   */
  private generateCpuAlert(cpuUsage: number, config: PerformanceAlertConfig) {
    const isCritical = cpuUsage > config.thresholds.cpuCritical;
    const type = isCritical ? "critical" : "warning";
    const threshold = isCritical ? config.thresholds.cpuCritical : config.thresholds.cpuWarning;

    return {
      type,
      metric: "CPU Usage",
      value: cpuUsage,
      threshold,
      message: `CPU usage is at ${cpuUsage}%, exceeding the ${type} threshold of ${threshold}%.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate memory usage alert
   */
  private generateMemoryAlert(memoryUsage: number, config: PerformanceAlertConfig) {
    const isCritical = memoryUsage > config.thresholds.memoryCritical;
    const type = isCritical ? "critical" : "warning";
    const threshold = isCritical
      ? config.thresholds.memoryCritical
      : config.thresholds.memoryWarning;

    return {
      type,
      metric: "Memory Usage",
      value: memoryUsage,
      threshold,
      message: `Memory usage is at ${memoryUsage}%, exceeding the ${type} threshold of ${threshold}%.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate load average alert
   */
  private generateLoadAlert(loadAvg: number, config: PerformanceAlertConfig) {
    const isCritical = loadAvg > config.thresholds.loadCritical;
    const type = isCritical ? "critical" : "warning";
    const threshold = isCritical ? config.thresholds.loadCritical : config.thresholds.loadWarning;

    return {
      type,
      metric: "System Load",
      value: loadAvg,
      threshold,
      message: `System load average is at ${loadAvg.toFixed(2)}, exceeding the ${type} threshold of ${threshold}.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send a notification to all connected clients
   */
  public sendNotification(notification: {
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    data?: Record<string, unknown>;
  }): void {
    if (!this.io || this.connectedClients.size === 0) return;

    this.io.emit("notification", notification);
    logger.info("Sent notification", { title: notification.title, type: notification.type });
  }

  /**
   * Get the number of connected clients
   */
  public getConnectedCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get the number of log subscribers
   */
  public getLogSubscriberCount(): number {
    return this.logSubscribers.size;
  }

  /**
   * Get the number of performance metrics subscribers
   */
  public getPerformanceSubscriberCount(): number {
    return this.performanceSubscribers.size;
  }

  /**
   * Clean up resources
   */
  public shutdown(): void {
    if (this.io) {
      this.io.close(() => {
        logger.info("Socket.io server closed");
      });
      this.io = null;
    }

    // Stop the performance monitor
    performanceMonitor.stop();
  }

  /**
   * Extract user ID from authentication token
   * Tries to handle both encrypted tokens and standard JWT tokens
   */
  private extractUserIdFromToken(token: string): string | null {
    try {
      // First check if this is an encrypted token
      try {
        // Try to decrypt the token first - this handles Discord tokens and other encrypted tokens
        const decryptedToken = decryptToken(token);
        logger.debug("Successfully decrypted token");

        // If the decrypted token looks like a JWT, parse it
        if (decryptedToken.includes(".") && decryptedToken.split(".").length === 3) {
          // Handle decrypted JWT
          return this.extractUserIdFromJwt(decryptedToken);
        }

        // Otherwise, the decrypted token itself might be the user ID
        return decryptedToken;
      } catch (decryptError) {
        // If decryption fails, it might be a raw JWT token
        logger.debug("Token decryption failed, trying JWT parsing");

        // Check if it's a JWT token format
        if (token.includes(".") && token.split(".").length === 3) {
          return this.extractUserIdFromJwt(token);
        }

        // If it's neither encrypted nor JWT, it might be a raw user ID
        if (token.match(/^[0-9a-f]{24}$/i)) {
          logger.debug("Token appears to be a raw MongoDB ID");
          return token;
        }

        logger.warn("Token is not recognized as encrypted, JWT, or MongoDB ID format");
        return null;
      }
    } catch (error) {
      logger.error("Error extracting user ID from token:", error);
      return null;
    }
  }

  /**
   * Extract user ID specifically from a JWT token
   */
  private extractUserIdFromJwt(jwtToken: string): string | null {
    try {
      const parts = jwtToken.split(".");
      if (parts.length !== 3) {
        logger.warn("Invalid JWT token format");
        return null;
      }

      // Decode the base64 payload
      const payload = Buffer.from(parts[1], "base64").toString();
      const parsedPayload = JSON.parse(payload);

      // Extract user ID from payload
      const userId = parsedPayload.id || parsedPayload.sub || parsedPayload.userId;

      if (!userId) {
        logger.warn("No user ID found in token payload");
        return null;
      }

      logger.info(`Extracted userId ${userId} from JWT`);
      return userId;
    } catch (error) {
      logger.error("Error parsing JWT token:", error);
      return null;
    }
  }

  /**
   * Load user's alert configuration from database
   */
  private async loadUserAlertConfig(socketId: string, userId: string): Promise<void> {
    try {
      const config = await this.getAlertConfigFromDb(userId);
      this.performanceAlertConfigs.set(socketId, config);
      logger.info(`Loaded alert config for user ${userId}`);
    } catch (error) {
      logger.error(`Error loading alert config for user ${userId}:`, error);
      // Use cached default config if there's an error
      this.performanceAlertConfigs.set(socketId, this.getCachedDefaultAlertConfig(userId));
    }
  }

  /**
   * Get alert configuration from database
   * Uses upsert to ensure a config exists without redundant read-then-write operations
   */
  private async getAlertConfigFromDb(userId: string): Promise<PerformanceAlertConfig> {
    try {
      // First check if config exists
      const config = await PerformanceAlertConfig.findOne({ userId });

      if (!config) {
        // Create default config if none exists - use upsert to prevent race conditions
        const defaultConfig = this.getCachedDefaultAlertConfig(userId);

        // Use findOneAndUpdate with upsert to atomically create if not exists
        const result = await PerformanceAlertConfig.findOneAndUpdate(
          { userId },
          { $setOnInsert: defaultConfig },
          { upsert: true, new: true },
        );

        logger.info(`Created default alert config for user ${userId}`);
        return result?.toObject() || defaultConfig;
      }

      return config.toObject();
    } catch (error) {
      logger.error(`Error getting alert config from DB for user ${userId}:`, error);
      return this.getCachedDefaultAlertConfig(userId);
    }
  }

  /**
   * Save alert configuration to database
   */
  private async saveAlertConfigToDb(config: PerformanceAlertConfig): Promise<void> {
    try {
      // Make sure we have a properly structured config with all required fields
      const safeConfig = {
        userId: config.userId,
        enabled: config.enabled !== undefined ? config.enabled : true,
        triggers: config.triggers || {},
        thresholds: config.thresholds || {},
        updatedAt: new Date(),
      };

      // Log the sanitized config only in debug mode to reduce log noise
      logger.debug(
        `Saving alert config for user ${safeConfig.userId}: ${JSON.stringify(safeConfig)}`,
      );

      // Save the sanitized config
      await PerformanceAlertConfig.updateOne(
        { userId: safeConfig.userId },
        { $set: safeConfig },
        { upsert: true },
      );

      // Update the cache if we're storing default configs
      if (this.defaultAlertConfigCache.has(safeConfig.userId)) {
        this.defaultAlertConfigCache.set(safeConfig.userId, safeConfig as PerformanceAlertConfig);
      }

      logger.info(`Saved alert config for user ${safeConfig.userId}`);
    } catch (error) {
      logger.error(
        `Error saving alert config to DB for user ${config.userId || "unknown"}:`,
        error,
      );
      throw error;
    }
  }
}

export default SocketService.getInstance();
