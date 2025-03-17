import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context';
import { DiscordAccount } from '../../types/account';
import WarningBanner from '../../components/common/WarningBanner';
import { NotificationContext } from '../../context';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { showNotification } = useContext(NotificationContext);
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<DiscordAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with actual API call when backend is ready
        const mockAccounts: DiscordAccount[] = [];
        setAccounts(mockAccounts);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
        showNotification(
          'error',
          'Error Loading Accounts',
          'Failed to fetch Discord accounts. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [showNotification]);

  const hasNoAccounts = !loading && accounts.length === 0;

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400 mb-6">
        Welcome back, {user?.name || 'User'}!
      </p>

      {hasNoAccounts && !dismissedWarning && (
        <WarningBanner
          title="No Discord Accounts Found"
          message={
            <>
              <p>
                You haven't set up any Discord accounts yet. To start using Discord Auto Meme, you
                need to add at least one Discord account.
              </p>
              <p className="mt-1">
                Follow the instructions to add your first Discord account and start sending memes
                automatically.
              </p>
            </>
          }
          actionText="Add Discord Account"
          actionLink="/accounts/new"
          dismissible
          onDismiss={() => setDismissedWarning(true)}
        />
      )}

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Discord Accounts</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {loading
                ? 'Loading accounts...'
                : accounts.length > 0
                  ? `You have ${accounts.length} connected Discord ${accounts.length === 1 ? 'account' : 'accounts'}`
                  : 'No accounts connected yet'}
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate(accounts.length > 0 ? '/accounts' : '/accounts/new')}
              >
                {accounts.length > 0 ? 'Manage Accounts' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activity</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {accounts.length > 0
                ? 'View your recent Discord activity'
                : 'Add an account to track activity'}
            </p>
            <div className="mt-4">
              <button
                type="button"
                disabled={accounts.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => navigate('/activity')}
              >
                View Activity
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Content</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {accounts.length > 0
                ? 'Manage your memes and automated content'
                : 'Add an account to manage content'}
            </p>
            <div className="mt-4">
              <button
                type="button"
                disabled={accounts.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => navigate('/content')}
              >
                Manage Content
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
