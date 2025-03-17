import React, { useContext, useEffect } from 'react';
import NotificationContext from '../../context/NotificationContext';
import useSocket from '../../hooks/useSocket';
import { SocketEventData } from '../../hooks/useSocket';

interface SystemStatus extends SocketEventData {
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  threadCount: number;
  lastUpdated: string;
}

interface SystemAlert extends Record<string, unknown> {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
}

interface LiveUpdatesProps {
  onStatusUpdate?: (status: SystemStatus) => void;
  onAlert?: (alert: SystemAlert) => void;
}

/**
 * Component that integrates with WebSockets to provide real-time updates
 * This component doesn't render anything visible, it just manages the WebSocket connection
 * and dispatches updates to the provided callbacks
 */
const LiveUpdates: React.FC<LiveUpdatesProps> = ({ onStatusUpdate, onAlert }) => {
  const { addNotification } = useContext(NotificationContext);
  const { isConnected, on } = useSocket({
    autoConnect: true,
  });

  // Set up event listeners for system updates
  useEffect(() => {
    if (!isConnected) return;

    // Handler for system status updates
    const handleStatusUpdate = (status: SystemStatus) => {
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }
    };

    // Handler for system alerts
    const handleSystemAlert = (alert: SystemAlert) => {
      if (onAlert) {
        onAlert(alert);
      }

      // Display notification for the alert
      addNotification({
        title: `${alert.type === 'critical' ? 'Critical' : 'Warning'} Alert: ${alert.metric}`,
        message: alert.message,
        type: alert.type === 'critical' ? 'error' : 'warning',
        data: alert,
      });
    };

    // Subscribe to events
    const unsubscribeStatus = on<SystemStatus>('system_status', handleStatusUpdate);
    const unsubscribeAlert = on<SystemAlert>('system_alert', handleSystemAlert);

    // Clean up subscriptions
    return () => {
      unsubscribeStatus();
      unsubscribeAlert();
    };
  }, [isConnected, on, onStatusUpdate, onAlert, addNotification]);

  // Component doesn't render anything visible
  return null;
};

export default LiveUpdates;
