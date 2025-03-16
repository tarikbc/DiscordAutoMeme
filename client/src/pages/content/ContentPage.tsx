import { useState, useEffect, useContext } from 'react';
import { ChartBarIcon, ArrowUpIcon, ArrowDownIcon, CogIcon, ClockIcon } from '@heroicons/react/24/outline';
import { NotificationContext } from '../../context';
import { ContentHistoryView, ContentSettings, ContentPreview } from '../../components/content';
import { Tab } from '@headlessui/react';

// Import the ContentSettingsData type from the ContentSettings component
import type { ContentSettingsData } from '../../components/content/ContentSettings';

interface ContentStats {
  totalDelivered: number;
  totalFavorites: number;
  totalReactions: number;
  topChannels: {
    id: string;
    name: string;
    count: number;
    percentage: number;
  }[];
  topCategories: {
    id: string;
    name: string;
    count: number;
    percentage: number;
  }[];
  deliveryByDay: {
    date: string;
    count: number;
  }[];
}

interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ContentItem {
  id: string;
  type: string;
  title: string;
  url: string;
  source: string;
  thumbnail?: string;
}

const ContentPage = () => {
  const { showNotification } = useContext(NotificationContext);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // This would be an API call to fetch content stats
        // For now, we'll use mock data

        // Mock stats data
        const mockStats: ContentStats = {
          totalDelivered: 487,
          totalFavorites: 124,
          totalReactions: 322,
          topChannels: [
            { id: 'chan1', name: 'memes', count: 210, percentage: 43.1 },
            { id: 'chan2', name: 'random', count: 98, percentage: 20.1 },
            { id: 'chan3', name: 'general', count: 65, percentage: 13.3 },
            { id: 'chan4', name: 'off-topic', count: 59, percentage: 12.1 },
            { id: 'chan5', name: 'gaming', count: 55, percentage: 11.3 }
          ],
          topCategories: [
            { id: 'cat1', name: 'Comedy', count: 187, percentage: 38.4 },
            { id: 'cat2', name: 'Gaming', count: 124, percentage: 25.5 },
            { id: 'cat3', name: 'Animals', count: 76, percentage: 15.6 },
            { id: 'cat4', name: 'Reaction', count: 52, percentage: 10.7 },
            { id: 'cat5', name: 'Tech', count: 48, percentage: 9.9 }
          ],
          deliveryByDay: Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return {
              date: date.toISOString().split('T')[0],
              count: Math.floor(Math.random() * 30) + 5
            };
          })
        };

        // Mock friends data
        const mockFriends: Friend[] = Array.from({ length: 8 }, (_, i) => ({
          id: `friend-${i + 1}`,
          name: `Friend ${i + 1}`,
          avatarUrl: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${i + 1}.jpg`
        }));

        setStats(mockStats);
        setFriends(mockFriends);
      } catch (error) {
        console.error('Failed to fetch content stats:', error);
        showNotification('error', 'Error Loading Stats', 'Failed to load content statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showNotification, timeRange]);

  const renderStat = (title: string, value: number, change?: number) => {
    return (
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value.toLocaleString()}</dd>
        {change !== undefined && (
          <dd className={`mt-1 flex items-center text-sm ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {change >= 0 ? (
              <ArrowUpIcon className="h-4 w-4 flex-shrink-0 mr-1.5" aria-hidden="true" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 flex-shrink-0 mr-1.5" aria-hidden="true" />
            )}
            <span className="sr-only">{change >= 0 ? 'Increased' : 'Decreased'} by</span>
            {Math.abs(change)}% from last {timeRange}
          </dd>
        )}
      </div>
    );
  };

  const renderProgressBar = (value: number, color: string) => {
    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    );
  };

  const openContentPreview = () => {
    // This would typically be fetching content from an API
    // Mock content for preview
    const mockContent: ContentItem = {
      id: 'content-123',
      type: 'meme',
      title: 'Funny Programming Meme',
      url: 'https://i.imgur.com/jQIGnkV.jpeg',
      source: 'Reddit - r/ProgrammerHumor',
    };

    setPreviewContent(mockContent);
  };

  const sendContent = async (contentId: string, friendId: string): Promise<void> => {
    // This would typically be an API call to send content
    console.log(`Sending content ${contentId} to friend ${friendId}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Success
    showNotification('success', 'Content Sent', 'Content was successfully sent to your friend.');
  };

  const handleSaveSettings = async (settings: ContentSettingsData): Promise<void> => {
    // This would typically be an API call to save settings
    console.log('Saving settings:', settings);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Success
    showNotification('success', 'Settings Saved', 'Content settings have been updated successfully.');
  };

  return (
    <>
      <div className="pb-5 border-b border-gray-200 dark:border-gray-700 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Delivery</h1>

        <div className="mt-3 sm:mt-0 sm:ml-4">
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ${timeRange === '7d'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                } focus:z-10 focus:outline-none`}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ${timeRange === '30d'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                } focus:z-10 focus:outline-none`}
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('90d')}
              className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ${timeRange === '90d'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                } focus:z-10 focus:outline-none`}
            >
              90d
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-5">
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${selected
                  ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white'
                }`
              }
            >
              <span className="flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Dashboard
              </span>
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${selected
                  ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white'
                }`
              }
            >
              <span className="flex items-center justify-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                History
              </span>
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${selected
                  ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white'
                }`
              }
            >
              <span className="flex items-center justify-center">
                <CogIcon className="h-5 w-5 mr-2" />
                Settings
              </span>
            </Tab>
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              {loading ? (
                <div className="flex justify-center my-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : stats ? (
                <div>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {renderStat('Total Content Delivered', stats.totalDelivered, 12)}
                    {renderStat('Total Favorites', stats.totalFavorites, 8)}
                    {renderStat('Total Reactions', stats.totalReactions, -3)}
                  </div>

                  {/* Charts */}
                  <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Top Channels */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                          Top Channels
                        </h3>
                        <div className="mt-5">
                          <ul className="space-y-4">
                            {stats.topChannels.map((channel) => (
                              <li key={channel.id}>
                                <div className="flex items-center justify-between mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                  <span>#{channel.name}</span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {channel.count} ({channel.percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                {renderProgressBar(channel.percentage, 'bg-purple-600 dark:bg-purple-500')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Top Categories */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                          Top Categories
                        </h3>
                        <div className="mt-5">
                          <ul className="space-y-4">
                            {stats.topCategories.map((category) => (
                              <li key={category.id}>
                                <div className="flex items-center justify-between mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                  <span>{category.name}</span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {category.count} ({category.percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                {renderProgressBar(category.percentage, 'bg-blue-600 dark:bg-blue-500')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery By Day Chart */}
                  <div className="mt-5 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center">
                        <ChartBarIcon className="h-5 w-5 mr-2 text-gray-400" />
                        Daily Content Delivery
                      </h3>
                      <div className="mt-3 h-64 relative">
                        {/* Simple bar chart implementation */}
                        <div className="absolute inset-0 flex items-end">
                          {stats.deliveryByDay.map((day, index) => (
                            <div key={day.date} className="flex-1 flex flex-col justify-end items-center">
                              <div
                                className="w-5/6 bg-blue-500 dark:bg-blue-400 rounded-t"
                                style={{
                                  height: `${(day.count / Math.max(...stats.deliveryByDay.map(d => d.count))) * 100}%`,
                                  opacity: index % 2 === 0 ? 0.9 : 1
                                }}
                              ></div>
                              {/* Only show every 5th date for readability */}
                              {index % 5 === 0 && (
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-top-left">
                                  {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Content Delivery */}
                  <div className="mt-5 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        Manual Content Delivery
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Send content manually to specific friends or groups.
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={openContentPreview}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Send New Content
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  No data available. Please try again later.
                </div>
              )}
            </Tab.Panel>

            <Tab.Panel>
              <ContentHistoryView />
            </Tab.Panel>

            <Tab.Panel>
              <ContentSettings onSave={handleSaveSettings} />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {previewContent && (
        <ContentPreview
          content={previewContent}
          onClose={() => setPreviewContent(null)}
          onSend={sendContent}
          friends={friends}
        />
      )}
    </>
  );
};

export default ContentPage; 