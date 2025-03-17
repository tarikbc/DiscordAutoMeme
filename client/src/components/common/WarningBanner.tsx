import { ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { Link } from 'react-router-dom';

interface WarningBannerProps {
  title: string;
  message: ReactNode;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const WarningBanner = ({
  title,
  message,
  actionText,
  actionLink,
  onAction,
  dismissible = false,
  onDismiss,
}: WarningBannerProps) => {
  return (
    <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{title}</h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
          {actionText && (actionLink || onAction) && (
            <div className="mt-4">
              {actionLink ? (
                <Link
                  to={actionLink}
                  className="whitespace-nowrap font-medium text-sm text-yellow-800 dark:text-yellow-300 hover:text-yellow-600 dark:hover:text-yellow-200"
                >
                  {actionText} <span aria-hidden="true">&rarr;</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onAction}
                  className="whitespace-nowrap font-medium text-sm text-yellow-800 dark:text-yellow-300 hover:text-yellow-600 dark:hover:text-yellow-200"
                >
                  {actionText} <span aria-hidden="true">&rarr;</span>
                </button>
              )}
            </div>
          )}
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md p-1.5 text-yellow-500 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarningBanner;
