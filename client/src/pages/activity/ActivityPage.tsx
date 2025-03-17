import { useState, useEffect, useContext } from 'react';
import { CalendarIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { NotificationContext } from '../../context';

interface ActivityEntry {
  id: string;
  accountId: string;
  accountName: string;
  type: 'GAME' | 'MUSIC' | 'STREAMING' | 'WATCHING' | 'CUSTOM' | 'COMPETING';
  name: string;
  startedAt: string;
  endedAt?: string;
  details?: string;
  url?: string;
}

const ActivityPage = () => {
  const { showNotification } = useContext(NotificationContext);
  const [activityData, setActivityData] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // This would be API calls to fetch accounts and activity data
        // For now, we'll use mock data

        // Mock accounts
        const mockAccounts = [
          { id: 'acc1', name: 'Gaming Account' },
          { id: 'acc2', name: 'Music Account' },
        ];

        // Mock activity data
        const mockActivityData: ActivityEntry[] = [
          {
            id: 'act1',
            accountId: 'acc1',
            accountName: 'Gaming Account',
            type: 'GAME',
            name: 'Valorant',
            startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            endedAt: new Date().toISOString(),
            details: 'Competitive Match',
          },
          {
            id: 'act2',
            accountId: 'acc1',
            accountName: 'Gaming Account',
            type: 'GAME',
            name: 'Minecraft',
            startedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            endedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          },
          {
            id: 'act3',
            accountId: 'acc2',
            accountName: 'Music Account',
            type: 'MUSIC',
            name: 'Spotify',
            startedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
            details: 'Listening to lo-fi beats',
          },
        ];

        setAccounts(mockAccounts);
        setActivityData(mockActivityData);
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        showNotification(
          'error',
          'Error Loading Activity',
          'Failed to load activity data. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showNotification, timeRange]);

  const getFilteredActivity = () => {
    return activityData.filter(activity => {
      const matchesAccount = selectedAccount === 'all' || activity.accountId === selectedAccount;
      const matchesType = selectedType === 'all' || activity.type === selectedType;
      return matchesAccount && matchesType;
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const durationMs = end - start;

    const minutes = Math.floor(durationMs / 60000);
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'GAME':
        return (
          <div className="rounded-md bg-purple-50 dark:bg-purple-900/30 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-purple-600 dark:text-purple-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
            </svg>
          </div>
        );
      case 'MUSIC':
        return (
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-600 dark:text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        );
      case 'STREAMING':
        return (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-600 dark:text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case 'WATCHING':
        return (
          <div className="rounded-md bg-blue-50 dark:bg-blue-900/30 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600 dark:text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-md bg-gray-50 dark:bg-gray-900/30 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600 dark:text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
    }
  };

  const filteredActivity = getFilteredActivity();

  return (
    <>
      <div className="pb-5 border-b border-gray-200 dark:border-gray-700 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Timeline</h1>

        <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-wrap gap-2">
          {/* Account filter */}
          <select
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            className="block rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Accounts</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          {/* Activity type filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="block rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Activity Types</option>
            <option value="GAME">Games</option>
            <option value="MUSIC">Music</option>
            <option value="STREAMING">Streaming</option>
            <option value="WATCHING">Watching</option>
            <option value="CUSTOM">Custom</option>
            <option value="COMPETING">Competing</option>
          </select>

          {/* Time range selector */}
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setTimeRange('24h')}
              className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ${
                timeRange === '24h'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
              } focus:z-10 focus:outline-none`}
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
              } focus:z-10 focus:outline-none`}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
              } focus:z-10 focus:outline-none`}
            >
              30d
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredActivity.length > 0 ? (
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {filteredActivity.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== filteredActivity.length - 1 ? (
                      <span
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
                        <div>
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {activity.name}
                            </p>
                          </div>
                          <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 items-center">
                            <span className="inline-flex items-center">
                              <UserIcon
                                className="mr-1.5 h-4 w-4 text-gray-400"
                                aria-hidden="true"
                              />
                              {activity.accountName}
                            </span>
                            <span className="inline-flex items-center">
                              <ClockIcon
                                className="mr-1.5 h-4 w-4 text-gray-400"
                                aria-hidden="true"
                              />
                              {formatDuration(activity.startedAt, activity.endedAt)}
                            </span>
                            <span className="inline-flex items-center">
                              <CalendarIcon
                                className="mr-1.5 h-4 w-4 text-gray-400"
                                aria-hidden="true"
                              />
                              {new Date(activity.startedAt).toLocaleString()}
                            </span>
                          </div>
                          {activity.details && (
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                              {activity.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
              No activity found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedAccount !== 'all' || selectedType !== 'all'
                ? 'Try changing your filters to see more activity.'
                : 'No Discord activity has been recorded in the selected time period.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default ActivityPage;
