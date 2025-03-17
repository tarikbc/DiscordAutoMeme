import React, { useState, useEffect, ReactNode } from 'react';
import socketService from '../services/socketService';
import { SocketEventData } from '../hooks/useSocket';
import {
  NotificationContext,
  type Notification,
  SystemAlert,
  AlertSeverity,
  MAX_NOTIFICATIONS,
  getSeverityIcon
} from '../services/notificationService';

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Set up socket listener for system alerts
  useEffect(() => {
    // Use a type-safe handler that matches SocketEventData constraints
    const handleSystemAlert = (data: SocketEventData) => {
      // Cast to SystemAlert since we know the structure
      const alert = data as SystemAlert;

      // Convert system alert to notification
      const notification: Notification = {
        id: alert.id || `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: `${alert.metric} Alert`,
        message: alert.message,
        severity: alert.type === 'critical' ? 'critical' : 'warning',
        timestamp: new Date(alert.timestamp),
        read: false,
        data: alert,
      };

      // Add the notification
      setNotifications(prev => {
        // Add new notification at the beginning
        const updated = [notification, ...prev];

        // Limit to max notifications
        if (updated.length > MAX_NOTIFICATIONS) {
          return updated.slice(0, MAX_NOTIFICATIONS);
        }

        return updated;
      });

      // Show browser notification if available and permissions granted
      showBrowserNotification(notification);
    };

    // Set up socket listener
    const setupSocketListener = async () => {
      try {
        if (!socketService.isSocketConnected()) {
          await socketService.connect();
        }

        // Register listener for system alerts
        socketService.on('system_alert', handleSystemAlert);
      } catch (error) {
        console.error('Failed to set up socket listener for alerts:', error);
      }
    };

    setupSocketListener();

    // Clean up on unmount
    return () => {
      socketService.off('system_alert', handleSystemAlert);
    };
  }, []);

  // Method to show an alert programmatically
  const showAlert = (title: string, message: string, severity: AlertSeverity) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      severity,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));

    // Show browser notification
    showBrowserNotification(notification);
  };

  // Method to mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  // Method to mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true })),
    );
  };

  // Method to clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    // Check if browser notifications are supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      // Show a browser notification
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: getSeverityIcon(notification.severity),
      });

      // Close the notification after a timeout
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

      // Handle click on the notification
      browserNotification.onclick = () => {
        window.focus();
        markAsRead(notification.id);
      };
    }
    // Request permission if not granted yet (but not denied)
    else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showAlert,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 