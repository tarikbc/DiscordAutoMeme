import Transport from "winston-transport";
import SocketService from "../services/SocketService";
import { v4 as uuidv4 } from "uuid";

/**
 * Custom Winston transport that sends logs to connected socket clients
 */
export class SocketTransport extends Transport {
  private socketService: typeof SocketService;
  private buffer: any[] = [];
  private bufferSize: number;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(options: any = {}) {
    super(options);
    this.socketService = SocketService;
    this.level = options.level || "info";
    this.bufferSize = options.bufferSize || 10;
    this.setupFlushInterval(options.flushInterval || 2000);
  }

  /**
   * Set up interval to flush logs even if buffer isn't full
   */
  private setupFlushInterval(interval: number): void {
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, interval);
  }

  /**
   * Emit logs to subscribed clients
   */
  private flush(): void {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    // Only emit if there are log subscribers
    if (this.socketService.getLogSubscriberCount() > 0) {
      this.socketService.emitLogs(logs);
    }
  }

  /**
   * Winston transport log method
   */
  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Extract component from metadata if available
    let component = "system";
    if (info.component) {
      component = info.component;
    } else if (info.service) {
      component = info.service;
    } else if (info.metadata && info.metadata.component) {
      component = info.metadata.component;
    }

    // Extract details from various fields
    let details = undefined;
    if (info.stack) {
      details = info.stack;
    } else if (info.details) {
      details = info.details;
    } else if (info.error instanceof Error) {
      details = info.error.stack || info.error.message;
    } else if (info.error) {
      details = typeof info.error === "string" ? info.error : JSON.stringify(info.error, null, 2);
    } else if (info.metadata) {
      // Filter out common metadata fields
      const filteredMeta = { ...info.metadata };
      delete filteredMeta.service;
      delete filteredMeta.component;
      delete filteredMeta.timestamp;

      // Only include if there are remaining fields
      if (Object.keys(filteredMeta).length > 0) {
        details = JSON.stringify(filteredMeta, null, 2);
      }
    }

    // Format the log entry for client consumption
    const logEntry = {
      id: uuidv4(),
      timestamp: info.timestamp || new Date().toISOString(),
      level: info.level || "info",
      component,
      message: info.message || "",
      details,
    };

    // Add to buffer
    this.buffer.push(logEntry);

    // Flush buffer if it reaches threshold
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    callback();
  }

  /**
   * Clean up resources
   */
  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush any remaining logs
    this.flush();
  }
}

export default SocketTransport;
