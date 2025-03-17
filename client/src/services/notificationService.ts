import { createContext, useContext } from 'react';

// Alert types
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

// This interface extends SocketEventData to ensure type compatibility
export interface SystemAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
  read?: boolean;
  [key: string]: unknown; // Add index signature for SocketEventData compatibility
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  read: boolean;
  data?: unknown;
}

// Context for the notification service
export const NotificationContext = createContext<{
  notifications: Notification[];
  unreadCount: number;
  showAlert: (title: string, message: string, severity: AlertSeverity) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}>({
  notifications: [],
  unreadCount: 0,
  showAlert: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
});

// Maximum number of notifications to store
export const MAX_NOTIFICATIONS = 50;

// Hook to use the notification service
export const useNotifications = () => useContext(NotificationContext);

// Get icon based on severity
export const getSeverityIcon = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'critical':
      return '/icons/critical.png';
    case 'warning':
      return '/icons/warning.png';
    case 'success':
      return '/icons/success.png';
    default:
      return '/icons/info.png';
  }
};

export default NotificationContext;
