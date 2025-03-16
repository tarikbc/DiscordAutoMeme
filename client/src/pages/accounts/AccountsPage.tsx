import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';
import { NotificationContext } from '../../context';
import { DiscordAccount } from '../../types/account';
import WarningBanner from '../../components/common/WarningBanner';

const AccountsPage = () => {
  const { showNotification } = useContext(NotificationContext);
  const [accounts, setAccounts] = useState<DiscordAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        // For now, we'll use mock data until the API is connected
        const mockAccounts: DiscordAccount[] = [];
        setAccounts(mockAccounts);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
        showNotification('error', 'Error Loading Accounts', 'Failed to fetch Discord accounts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [showNotification]);

  const toggleAccountStatus = async (accountId: string, currentStatus: boolean) => {
    try {
      // This would be an API call to start/stop the account
      // For now, we'll just update the local state
      setAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.id === accountId
            ? {
              ...account,
              isActive: !currentStatus,
              status: !currentStatus ? 'connecting' : 'offline'
            }
            : account
        )
      );

      showNotification(
        'success',
        `Account ${currentStatus ? 'Stopped' : 'Started'}`,
        `Discord account has been ${currentStatus ? 'stopped' : 'started'} successfully.`
      );
    } catch (error) {
      console.error(`Failed to ${currentStatus ? 'stop' : 'start'} account:`, error);
      showNotification(
        'error',
        `Error ${currentStatus ? 'Stopping' : 'Starting'} Account`,
        `Failed to ${currentStatus ? 'stop' : 'start'} Discord account. Please try again.`
      );
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      // This would be an API call to delete the account
      // For now, we'll just update the local state
      setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== accountId));

      showNotification(
        'success',
        'Account Deleted',
        'Discord account has been deleted successfully.'
      );
    } catch (error) {
      console.error('Failed to delete account:', error);
      showNotification(
        'error',
        'Error Deleting Account',
        'Failed to delete Discord account. Please try again.'
      );
    }
  };

  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    let textColor = '';

    switch (status) {
      case 'online':
        bgColor = 'bg-green-100 dark:bg-green-800/30';
        textColor = 'text-green-800 dark:text-green-200';
        break;
      case 'connecting':
        bgColor = 'bg-yellow-100 dark:bg-yellow-800/30';
        textColor = 'text-yellow-800 dark:text-yellow-200';
        break;
      case 'error':
        bgColor = 'bg-red-100 dark:bg-red-800/30';
        textColor = 'text-red-800 dark:text-red-200';
        break;
      default:
        bgColor = 'bg-gray-100 dark:bg-gray-700';
        textColor = 'text-gray-800 dark:text-gray-200';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discord Accounts</h1>
        <Link
          to="/accounts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Account
        </Link>
      </div>

      {accounts.length === 0 && !loading && (
        <WarningBanner
          title="No Discord Accounts Found"
          message="To start using Discord Auto Meme, you need to add at least one Discord account. Click the 'Add Account' button above to get started."
          actionText="Learn how to add an account"
          actionLink="/setup/discord"
        />
      )}

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          {accounts.length > 0 ? (
            <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map((account) => (
                <li key={account.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Added on {new Date(account.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderStatusBadge(account.status)}
                      </div>
                    </div>
                    <div className="mt-4 sm:flex sm:justify-between">
                      <div className="sm:flex sm:items-center">
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <span className="mr-2">
                            {account.friendCount} {account.friendCount === 1 ? 'friend' : 'friends'}
                          </span>
                          {account.lastActive && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Last active: {new Date(account.lastActive).toLocaleString()}</span>
                            </>
                          )}
                          {account.error && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-red-500 dark:text-red-400">{account.error}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center space-x-3 sm:mt-0">
                        <button
                          type="button"
                          onClick={() => toggleAccountStatus(account.id, account.isActive)}
                          className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md ${account.isActive
                            ? 'text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/40'
                            : 'text-green-700 dark:text-green-200 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40'
                            }`}
                        >
                          {account.isActive ? (
                            <>
                              <StopIcon className="mr-1 h-4 w-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <PlayIcon className="mr-1 h-4 w-4" />
                              Start
                            </>
                          )}
                        </button>
                        <Link
                          to={`/accounts/${account.id}/edit`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40"
                        >
                          <PencilIcon className="mr-1 h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteAccount(account.id)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <TrashIcon className="mr-1 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No accounts found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new Discord account.</p>
              <div className="mt-6">
                <Link
                  to="/accounts/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Discord Account
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AccountsPage; 