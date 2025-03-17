import { useState, useEffect, useCallback, useContext } from 'react';
import socketService from '../services/socketService';
import { AuthContext } from '../context/';

// Generic event data type for socket events
export interface SocketEventData {
  [key: string]: unknown;
}

// System status data structure from server
export interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  threadCount: number;
  lastUpdated: string;
}

// Alert data structure from server
export interface SystemAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

// Notification data structure
export interface Notification {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

interface UseSocketOptions {
  autoConnect?: boolean;
  events?: {
    [event: string]: (data: SocketEventData) => void;
  };
}

interface UseSocketResult {
  isConnected: boolean;
  socket: ReturnType<typeof socketService.getSocket>;
  connect: () => Promise<void>;
  disconnect: () => void;
  on: <T extends SocketEventData = SocketEventData>(
    event: string,
    callback: (data: T) => void,
  ) => () => void;
  off: (event: string, callback?: (data: SocketEventData) => void) => void;
  emit: <T extends SocketEventData = SocketEventData>(event: string, data?: T) => void;
  emitWithAck: <
    T extends SocketEventData = SocketEventData,
    R extends SocketEventData = SocketEventData,
  >(
    event: string,
    data?: T,
    timeout?: number,
  ) => Promise<R>;
}

export const useSocket = (options: UseSocketOptions = {}): UseSocketResult => {
  const { autoConnect = true, events = {} } = options;
  const [isConnected, setIsConnected] = useState(socketService.isSocketConnected());
  const { token } = useContext(AuthContext);

  // Connect to socket
  const connect = useCallback(async () => {
    try {
      // Only connect if token exists
      if (token) {
        await socketService.connect(token);
      }
    } catch (error) {
      console.error('Socket connection failed:', error);
    }
  }, [token]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  // Register connection listener
  useEffect(() => {
    const unregister = socketService.registerConnectionListener(connected => {
      setIsConnected(connected);
    });

    return unregister;
  }, []);

  // Connect on mount if autoConnect is true and we have a token
  useEffect(() => {
    if (autoConnect && token && !socketService.isSocketConnected()) {
      connect();
    }

    return () => {
      // Don't disconnect on unmount, socket should stay connected
      // This allows the app to receive notifications even when navigating between pages
    };
  }, [autoConnect, token, connect]);

  // Register event listeners from options
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Register all events from options
    Object.entries(events).forEach(([event, handler]) => {
      const unsubscribe = socketService.on(event, handler);
      unsubscribers.push(unsubscribe);
    });

    // Cleanup function to unregister all event listeners
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [events]);

  // Wrapper for socketService.on
  const on = useCallback(
    <T extends SocketEventData = SocketEventData>(event: string, callback: (data: T) => void) => {
      return socketService.on<T>(event, callback);
    },
    [],
  );

  // Wrapper for socketService.off
  const off = useCallback((event: string, callback?: (data: SocketEventData) => void) => {
    socketService.off(event, callback);
  }, []);

  // Wrapper for socketService.emit
  const emit = useCallback(
    <T extends SocketEventData = SocketEventData>(event: string, data?: T) => {
      socketService.emit<T>(event, data);
    },
    [],
  );

  // Wrapper for socketService.emitWithAck
  const emitWithAck = useCallback(
    <T extends SocketEventData = SocketEventData, R extends SocketEventData = SocketEventData>(
      event: string,
      data?: T,
      timeout?: number,
    ): Promise<R> => {
      return socketService.emitWithAck<T, R>(event, data, timeout);
    },
    [],
  );

  return {
    isConnected,
    socket: socketService.getSocket(),
    connect,
    disconnect,
    on,
    off,
    emit,
    emitWithAck,
  };
};

export default useSocket;
