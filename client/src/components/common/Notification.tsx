import { Fragment, useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';

export type NotificationType = 'success' | 'error' | 'warning';

interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  show: boolean;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const Notification = ({
  type = 'success',
  title,
  message,
  show,
  onClose,
  autoClose = true,
  duration = 5000,
}: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, isVisible, onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />;
      default:
        return <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/30';
      default:
        return 'bg-green-50 dark:bg-green-900/30';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-green-800 dark:text-green-200';
    }
  };

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        <Transition
          show={isVisible}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${getBgColor()}`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">{getIcon()}</div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className={`text-sm font-medium ${getTextColor()}`}>{title}</p>
                  <p className={`mt-1 text-sm ${getTextColor()}`}>{message}</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className={`inline-flex rounded-md ${getBgColor()} text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    onClick={() => {
                      setIsVisible(false);
                      onClose();
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default Notification;
