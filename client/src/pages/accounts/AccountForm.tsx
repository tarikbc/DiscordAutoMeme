import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { DiscordAccount } from '../../types/account';
import { NotificationContext } from '../../context';
import api from '../../services/api';

interface AccountFormProps {
  mode: 'create' | 'edit';
}

const AccountForm = ({ mode }: AccountFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useContext(NotificationContext);

  // Check if we're in setup mode based on URL
  const isSetupMode = location.pathname.includes('/setup');

  const [accountName, setAccountName] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [fetchingAccount, setFetchingAccount] = useState(mode === 'edit');

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (mode !== 'edit' || !id) return;

      try {
        setFetchingAccount(true);
        // This would be an API call to get account details
        // For now we'll just set placeholder data

        // Mock data for demonstration
        const account: DiscordAccount = {
          id: id,
          userId: 'user123',
          name: 'My Discord Account',
          status: 'offline',
          token: 'mock-token-xxx', // This would normally be masked or not returned
          isActive: true,
          friendCount: 0,
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setAccountName(account.name);
        // Token is typically not displayed in full
        setDiscordToken('•••••••••••••••••••••••••••');
        setIsActive(account.isActive);
      } catch (error) {
        console.error('Failed to fetch account details:', error);
        showNotification('error', 'Error Loading Account', 'Failed to load account details. Please try again.');
        setError('Failed to load account details. Please try again.');
      } finally {
        setFetchingAccount(false);
      }
    };

    fetchAccountDetails();
  }, [id, mode, showNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountName.trim()) {
      setError('Please enter an account name');
      return;
    }

    if (mode === 'create' && !discordToken.trim()) {
      setError('Please enter a Discord token');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const accountData = {
          name: accountName.trim(),
          token: discordToken.trim()
        };

        if (isSetupMode) {
          // Use the setup API endpoint during onboarding
          await api.setup.addAccount(accountData);

          // Complete setup if this is the final step of setup
          // If we need to determine if this is the last step, we would need to get setup status first
          // For now, assuming this is the only setup step
          await api.setup.complete();

          showNotification('success', 'Setup Complete', 'Your Discord account has been added successfully.');
          navigate('/dashboard');
        } else {
          // Use the regular accounts API endpoint
          await api.accounts.create(accountData);

          showNotification('success', 'Account Created', 'Discord account has been created successfully.');
          navigate('/accounts');
        }
      } else if (mode === 'edit' && id) {
        // Update existing account
        const updates: { name: string; token?: string; isActive: boolean } = {
          name: accountName.trim(),
          isActive
        };

        // Only include token in update if it was changed (not masked)
        if (!discordToken.includes('•')) {
          updates.token = discordToken.trim();
        }

        // This would be an API call to update the account
        await api.accounts.update(id, updates);

        showNotification('success', 'Account Updated', 'Discord account has been updated successfully.');
        navigate('/accounts');
      }
    } catch (err) {
      console.error('Failed to save account:', err);
      setError(err instanceof Error ? err.message : 'Failed to save Discord account');
      setLoading(false);
    }
  };

  if (fetchingAccount) {
    return (
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        {isSetupMode ? 'Set Up Your Discord Account' : (mode === 'create' ? 'Add Discord Account' : 'Edit Discord Account')}
      </h1>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Account Name
              </label>
              <div className="mt-1">
                <input
                  id="account-name"
                  name="account-name"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., My Discord Account"
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  A friendly name to identify this account in the dashboard
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="discord-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Discord Token
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="discord-token"
                  name="discord-token"
                  type={showToken ? "text" : "password"}
                  required={mode === 'create'}
                  value={discordToken}
                  onChange={(e) => setDiscordToken(e.target.value)}
                  placeholder={mode === 'edit' ? "Leave blank to keep current token" : "Your Discord token"}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white pr-12 disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The authorization token from your Discord account
              </p>
            </div>

            {mode === 'edit' && (
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="is-active"
                    name="is-active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="is-active" className="font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    When active, the account will automatically connect to Discord
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">How to get your Discord token</h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open Discord in your browser or desktop app</li>
                      <li>Press Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac) to open Developer Tools</li>
                      <li>Go to the "Network" tab</li>
                      <li>Type "api" in the filter box</li>
                      <li>Refresh the page</li>
                      <li>Click on any request that appears</li>
                      <li>Look for the "Authorization" header in the "Headers" tab</li>
                      <li>Copy the value (this is your Discord token)</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {isSetupMode && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md border-l-4 border-yellow-500 mt-4">
                <h4 className="text-yellow-800 dark:text-yellow-300 font-medium">Important Security Warning</h4>
                <p className="mt-2 text-yellow-700 dark:text-yellow-200 text-sm">
                  Your Discord token gives full access to your account. Never share it with anyone else or
                  enter it on any untrusted websites. We securely encrypt your token and only use it for
                  the specific features you enable.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => isSetupMode ? navigate(-1) : navigate('/accounts')}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSetupMode ? 'Back' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (isSetupMode ? 'Setting Up...' : (mode === 'create' ? 'Creating...' : 'Updating...'))
                  : (isSetupMode ? 'Continue' : (mode === 'create' ? 'Create Account' : 'Update Account'))}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default AccountForm; 