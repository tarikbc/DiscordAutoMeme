import { io, Socket } from 'socket.io-client';

// Import the types from useSocket for consistency
import { SocketEventData } from '../hooks/useSocket';

// Import PerformanceAlertConfig from api
import PerformanceAlertConfig from './api';

interface SocketConfig {
  url: string;
  path?: string;
  options?: {
    withCredentials?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    timeout?: number;
    autoConnect?: boolean;
    auth?: {
      token?: string;
    };
  };
}

// Interface for performance alert config - matches the model
export interface PerformanceAlertConfig {
  userId: string;
  enabled: boolean;
  triggers: {
    [metricId: string]: boolean;
  };
  thresholds: {
    [metricId: string]: number;
  };
}

const DEFAULT_CONFIG: SocketConfig = {
  url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  options: {
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    autoConnect: false,
  },
};

// Create interface for alert response types
interface AlertResponse extends SocketEventData {
  success: boolean;
  error?: string;
}

interface AlertConfigResponse extends AlertResponse {
  config?: PerformanceAlertConfig;
}

/**
 * Socket event handler type
 */
type SocketEventHandler<T = SocketEventData> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private eventHandlers: Record<string, Array<SocketEventHandler>> = {};
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private isConnected: boolean = false;

  // Store the current performance alert configuration
  private performanceAlertConfig: PerformanceAlertConfig | null = null;

  // Added for the new connect method
  private userAuthenticated: boolean = false;

  constructor(config: SocketConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if the socket is connected
   */
  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Connect to the socket server
   */
  public connect(token?: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        // Already connected, authenticate if needed
        if (!this.userAuthenticated && (token || this.getAuthToken())) {
          this.authenticate()
            .then(() => {
              this.userAuthenticated = true;
              resolve(this.socket!);
            })
            .catch(reject);
        } else {
          resolve(this.socket);
        }
        return;
      }

      // Set auth token if provided
      if (token) {
        this.config.options = {
          ...this.config.options,
          auth: {
            token,
          },
        };
      }

      try {
        this.socket = io(this.config.url, {
          ...this.config.options,
          path: this.config.path,
        });

        // Setup event listeners
        this.socket.on('connect', this.handleConnect.bind(this));
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
        this.socket.on('connect_error', this.handleConnectError.bind(this));
        this.socket.on('reconnect_attempt', this.handleReconnectAttempt.bind(this));
        this.socket.on('reconnect', this.handleReconnect.bind(this));
        this.socket.on('reconnect_error', this.handleReconnectError.bind(this));
        this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));

        // Resolve when connected and authenticated
        this.socket.once('connect', () => {
          // If token is provided, authenticate after connection
          if (token || this.getAuthToken()) {
            this.authenticate()
              .then(() => {
                this.userAuthenticated = true;
                // Initialize performance alerts after successful authentication
                this.initializePerformanceAlerts();
                resolve(this.socket!);
              })
              .catch(error => {
                console.error('Authentication failed:', error);
                reject(error);
              });
          } else {
            resolve(this.socket!);
          }
        });

        // Reject if connection fails
        this.socket.once('connect_error', error => {
          reject(error);
        });

        // Connect if autoConnect is false
        if (!this.config.options?.autoConnect) {
          this.socket.connect();
        }
      } catch (error) {
        reject(error);
      }

      // Re-register existing event handlers
      Object.entries(this.eventHandlers).forEach(([event, handlers]) => {
        handlers.forEach(handler => {
          this.socket?.on(event, handler);
        });
      });
    });
  }

  /**
   * Subscribe to an event
   */
  on<T extends SocketEventData = SocketEventData>(
    event: string,
    handler: SocketEventHandler<T>,
  ): () => void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }

    // We need to use a type assertion here because we're storing handlers with different generic types
    // in the same array, which is safe because the Socket.io contract ensures the right data shape
    this.eventHandlers[event].push(handler as SocketEventHandler);

    // Register with socket if it exists
    if (this.socket) {
      this.socket.on(event, handler);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends SocketEventData = SocketEventData>(
    event: string,
    handler?: SocketEventHandler<T>,
  ): void {
    if (!handler) {
      // Remove all handlers for this event
      delete this.eventHandlers[event];
      this.socket?.off(event);
    } else {
      // Remove specific handler - we need to use type assertion here
      this.eventHandlers[event] = (this.eventHandlers[event] || []).filter(
        h => h !== (handler as SocketEventHandler),
      );
      this.socket?.off(event, handler);
    }
  }

  /**
   * Emit an event
   */
  emit<T extends SocketEventData = SocketEventData>(event: string, data?: T): void {
    if (!this.socket) {
      console.warn('Socket not initialized. Cannot emit event:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Emit an event and wait for acknowledgement
   */
  emitWithAck<
    T extends SocketEventData = SocketEventData,
    R extends SocketEventData = SocketEventData,
  >(event: string, data?: T, timeout = 5000): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized. Cannot emit event: ' + event));
        return;
      }

      // Set timeout for acknowledgement
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for acknowledgement of event: ${event}`));
      }, timeout);

      this.socket.emit(event, data, (response: R) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  /**
   * Disconnect the socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.notifyConnectionListeners();
    }
  }

  /**
   * Register a connection listener
   */
  registerConnectionListener(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);

    // Immediately notify with current state
    listener(this.isConnected);

    // Return unregister function
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all connection listeners
   */
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(listener => {
      listener(this.isConnected);
    });
  }

  /**
   * Handle socket connection
   */
  private handleConnect(): void {
    this.isConnected = true;
    console.log('Socket connected');
    this.notifyConnectionListeners();

    // Initialize performance alert configuration
    this.initializePerformanceAlerts();
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(reason: string): void {
    this.isConnected = false;
    console.log('Socket disconnected:', reason);
    this.notifyConnectionListeners();
  }

  /**
   * Handle socket connection error
   */
  private handleConnectError(error: Error): void {
    console.error('Socket connection error:', error);
  }

  /**
   * Handle socket reconnection attempt
   */
  private handleReconnectAttempt(attempt: number): void {
    console.log(`Socket reconnection attempt #${attempt}`);
  }

  /**
   * Handle socket reconnection
   */
  private handleReconnect(attempt: number): void {
    this.isConnected = true;
    console.log(`Socket reconnected after ${attempt} attempts`);
    this.notifyConnectionListeners();
  }

  /**
   * Handle socket reconnection error
   */
  private handleReconnectError(error: Error): void {
    console.error('Socket reconnection error:', error);
  }

  /**
   * Handle socket reconnection failure
   */
  private handleReconnectFailed(): void {
    console.error('Socket reconnection failed');
  }

  /**
   * Get the current performance alert configuration
   */
  public getPerformanceAlertConfig(): PerformanceAlertConfig | null {
    return this.performanceAlertConfig;
  }

  /**
   * Set performance alert configuration
   */
  public setPerformanceAlertConfig(
    config: PerformanceAlertConfig,
  ): Promise<PerformanceAlertConfig> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        console.error('Socket not connected when trying to set alert config');
        reject(new Error('Socket not connected'));
        return;
      }

      // Ensure config has a valid userId
      if (!config.userId) {
        // Try to extract from token
        const token = localStorage.getItem('auth_token');
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.id) {
                config.userId = payload.id;
              }
            }
          } catch (e) {
            console.error('Failed to parse JWT token:', e);
          }
        }
      }

      console.log('Setting performance alert config:', config);

      // Use proper type instead of any
      const callback = (response: AlertResponse) => {
        if (response.success) {
          console.log('Successfully set alert config');
          this.performanceAlertConfig = config;
          resolve(config);
        } else {
          console.error('Failed to set alert config:', response.error);
          reject(new Error(response.error || 'Failed to set alert configuration'));
        }
      };

      this.socket.emit('set_performance_alerts', config, callback);
    });
  }

  /**
   * Enable/disable alerts for a specific metric
   */
  public togglePerformanceAlert(
    metricId: string,
    enabled: boolean,
  ): Promise<PerformanceAlertConfig> {
    if (!this.performanceAlertConfig) {
      console.error('No alert configuration available when trying to toggle', metricId);
      return Promise.reject(new Error('No alert configuration available'));
    }

    console.log(`Toggling alert for ${metricId} to ${enabled}`);

    const newConfig = {
      ...this.performanceAlertConfig,
      triggers: {
        ...this.performanceAlertConfig.triggers,
        [metricId]: enabled,
      },
    };

    return this.setPerformanceAlertConfig(newConfig);
  }

  /**
   * Get default alert thresholds for a specific metric
   */
  public getDefaultThreshold(metricId: string, type: 'warning' | 'critical'): number {
    const thresholds: Record<string, Record<'warning' | 'critical', number>> = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      network_rx: { warning: 1000000, critical: 10000000 }, // 1MB/s, 10MB/s
      network_tx: { warning: 1000000, critical: 10000000 }, // 1MB/s, 10MB/s
      load: { warning: 2, critical: 5 },
    };

    return thresholds[metricId]?.[type] || 0;
  }

  /**
   * Initialize performance alert configuration when connected
   */
  private initializePerformanceAlerts(): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot initialize alerts - socket not connected');
      return;
    }

    console.log('Initializing performance alerts');

    // Use proper type instead of any
    const callback = (response: AlertConfigResponse) => {
      if (response.success && response.config) {
        console.log('Received alert config from server:', response.config);
        this.performanceAlertConfig = response.config;
      } else {
        console.log('Creating default alert config');
        // Initialize with default configuration
        this.performanceAlertConfig = {
          userId: '',
          enabled: true,
          triggers: {
            cpu: true,
            memory: true,
            disk: true,
            network_rx: true,
            network_tx: true,
            load: true,
          },
          thresholds: {
            cpuWarning: this.getDefaultThreshold('cpu', 'warning'),
            cpuCritical: this.getDefaultThreshold('cpu', 'critical'),
            memoryWarning: this.getDefaultThreshold('memory', 'warning'),
            memoryCritical: this.getDefaultThreshold('memory', 'critical'),
            diskWarning: this.getDefaultThreshold('disk', 'warning'),
            diskCritical: this.getDefaultThreshold('disk', 'critical'),
            network_rxWarning: this.getDefaultThreshold('network_rx', 'warning'),
            network_rxCritical: this.getDefaultThreshold('network_rx', 'critical'),
            network_txWarning: this.getDefaultThreshold('network_tx', 'warning'),
            network_txCritical: this.getDefaultThreshold('network_tx', 'critical'),
            loadWarning: this.getDefaultThreshold('load', 'warning'),
            loadCritical: this.getDefaultThreshold('load', 'critical'),
          },
        };
      }
    };

    this.socket.emit('get_performance_alerts', '', callback);
  }

  /**
   * Get the current auth token from local storage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Extract user ID from JWT token
   */
  private extractUserIdFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.id || null;
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
      return null;
    }
  }

  /**
   * Authenticate with the socket server
   */
  public authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const token = this.getAuthToken();
      if (!token) {
        reject(new Error('No auth token found'));
        return;
      }

      // Extract the user ID from the token
      const userId = this.extractUserIdFromToken(token);

      // Create auth data with both token and userId when possible
      const authData = userId ? { token, userId } : { token };

      console.log('Authenticating with socket...', { hasUserId: !!userId });

      this.socket.emit(
        'authenticate',
        authData,
        (response: { success: boolean; error?: string }) => {
          if (response.success) {
            console.log('Socket authentication successful');
            resolve(true);
          } else {
            console.error('Socket authentication failed:', response.error);
            reject(new Error(response.error || 'Authentication failed'));
          }
        },
      );
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
