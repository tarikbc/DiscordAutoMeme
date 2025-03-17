import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast, ToastOptions } from 'react-toastify';
import socketService from '../services/socketService';

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Notification item interface
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  timestamp: string;
  link?: string;
  data?: Record<string, unknown>;
}

// Context interface
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

// Props interface
interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

// Toast options by type
const toastOptions: Record<NotificationType, ToastOptions> = {
  info: {
    className:
      'bg-blue-50 dark:bg-gray-800 text-blue-800 dark:text-blue-300 border-l-4 border-blue-500',
    progressClassName: 'bg-blue-500',
    autoClose: 5000,
  },
  success: {
    className:
      'bg-green-50 dark:bg-gray-800 text-green-800 dark:text-green-300 border-l-4 border-green-500',
    progressClassName: 'bg-green-500',
    autoClose: 5000,
  },
  warning: {
    className:
      'bg-yellow-50 dark:bg-gray-800 text-yellow-800 dark:text-yellow-300 border-l-4 border-yellow-500',
    progressClassName: 'bg-yellow-500',
    autoClose: 10000,
  },
  error: {
    className:
      'bg-red-50 dark:bg-gray-800 text-red-800 dark:text-red-300 border-l-4 border-red-500',
    progressClassName: 'bg-red-500',
    autoClose: false, // Don't auto close errors
  },
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 100,
}) => {
  // State for storing notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  // Socket event handlers
  useEffect(() => {
    // Handler for receiving notifications from socket
    const handleSocketNotification = (
      notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>,
    ) => {
      addNotification(notification);
    };

    // Subscribe to socket events
    const unsubscribe = socketService.on<Omit<Notification, 'id' | 'isRead' | 'timestamp'>>(
      'notification',
      handleSocketNotification,
    );

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      isRead: false,
      timestamp: new Date().toISOString(),
    };

    // Show toast notification
    toast(
      <div>
        <div className="font-medium">{notification.title}</div>
        <div className="text-sm">{notification.message}</div>
      </div>,
      {
        ...toastOptions[notification.type],
      },
    );

    // Add to state, keeping only maxNotifications
    setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications));

    // Save to localStorage
    saveNotificationsToStorage([newNotification, ...notifications].slice(0, maxNotifications));
  };

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      );
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, isRead: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };

  // Remove a specific notification
  const removeNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(notification => notification.id !== id);
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  // Helper function to save notifications to localStorage
  const saveNotificationsToStorage = (notificationsToSave: Notification[]) => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notificationsToSave));
    } catch (error) {
      console.error('Failed to save notifications to localStorage:', error);
    }
  };

  // Load notifications from localStorage on initial render
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
    } catch (error) {
      console.error('Failed to load notifications from localStorage:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
