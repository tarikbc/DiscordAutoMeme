import { useState, useEffect } from 'react';
import { useNotifications } from '../../services/notificationService';
import {
  BellIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  // Close the notification center when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const notificationCenter = document.getElementById('notification-center');

      if (
        notificationCenter &&
        !notificationCenter.contains(target) &&
        !target.closest('.notification-toggle')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get icon for notification severity
  const getNotificationIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    // Less than a minute
    if (diff < 60 * 1000) {
      return 'Just now';
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    // Format as date
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification bell icon */}
      <button
        className="notification-toggle relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {isOpen && (
        <div
          id="notification-center"
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  onClick={() => markAllAsRead()}
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                  onClick={() => clearNotifications()}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              <ul>
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    className={`border-b border-gray-200 dark:border-gray-700 ${notification.read ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'
                      }`}
                  >
                    <div className="px-4 py-3 flex items-start">
                      <div className="flex-shrink-0 pt-1">
                        {getNotificationIcon(notification.severity)}
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </p>
                          <button
                            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 