import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import NotificationContext, {
  Notification,
  NotificationType,
} from '../../context/NotificationContext';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  } = useContext(NotificationContext);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();

    // If less than 24 hours ago, show relative time
    if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Otherwise show formatted date
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="Mark all as read"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="p-1 text-xs text-red-600 dark:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="Clear all notifications"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    className={`relative ${
                      notification.isRead
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-blue-50 dark:bg-gray-700'
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <NotificationItem
                          notification={notification}
                          formatTimestamp={formatTimestamp}
                          getNotificationIcon={getNotificationIcon}
                        />
                      </Link>
                    ) : (
                      <div
                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <NotificationItem
                          notification={notification}
                          formatTimestamp={formatTimestamp}
                          getNotificationIcon={getNotificationIcon}
                        />
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      onClick={e => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      title="Remove notification"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
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

// Separate component for notification item
interface NotificationItemProps {
  notification: Notification;
  formatTimestamp: (timestamp: string) => string;
  getNotificationIcon: (type: NotificationType) => React.ReactNode;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  formatTimestamp,
  getNotificationIcon,
}) => {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 mr-3">{getNotificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {formatTimestamp(notification.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default NotificationCenter;
