import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, CogIcon, ChartBarIcon, ClockIcon, BoltIcon, CheckIcon, CalendarIcon } from '@heroicons/react/24/outline';
import FriendActivityTimeline from './FriendActivityTimeline';

interface ActivityPattern {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hourOfDay: number; // 0-23
  frequency: number; // 0-10 scale
}

interface ContentPreference {
  type: string;
  score: number; // 0-100
  reactionFrequency: number; // 0-100
}

interface TargetingSetting {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
}

interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  lastSeen?: string;
  activityPatterns: ActivityPattern[];
  contentPreferences: ContentPreference[];
  targetingSettings: TargetingSetting[];
  joinedAt: string;
  contentSent: number;
  contentReacted: number;
  favoriteGames?: string[];
  favoriteMusic?: string[];
}

export interface TargetingSettingsUpdate {
  targetingSettings: TargetingSetting[];
}

interface FriendDetailViewProps {
  friendId?: string;
  friend?: Friend;
  loading?: boolean;
  onBack?: () => void;
  onSettingsChanged?: (friendId: string, settings: TargetingSettingsUpdate) => Promise<void>;
}

const FriendDetailView = ({ friendId, friend, loading = false, onBack, onSettingsChanged }: FriendDetailViewProps) => {
  const [friendData, setFriendData] = useState<Friend | null>(friend || null);
  const [activeTab, setActiveTab] = useState<'patterns' | 'preferences' | 'targeting' | 'timeline'>('patterns');
  const [isSaving, setIsSaving] = useState(false);
  const [savingSuccess, setSavingSuccess] = useState(false);
  const mockDataGeneratedRef = useRef(false);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('7d');

  // Mock data for development
  useEffect(() => {
    if (!friend && !loading && friendId && !mockDataGeneratedRef.current) {
      mockDataGeneratedRef.current = true;
      // Generate activity patterns matrix (days x hours)
      const patterns: ActivityPattern[] = [];
      const daysOfWeek = 7;
      const hoursOfDay = 24;

      for (let day = 0; day < daysOfWeek; day++) {
        for (let hour = 0; hour < hoursOfDay; hour++) {
          // Higher frequency in evenings and weekends
          let baseFrequency = 0;

          // Weekend boost
          if (day === 0 || day === 6) {
            baseFrequency += 3;
          }

          // Evening boost (5pm - 11pm)
          if (hour >= 17 && hour <= 23) {
            baseFrequency += 4;
          }

          // Afternoon boost (1pm - 4pm)
          if (hour >= 13 && hour <= 16) {
            baseFrequency += 2;
          }

          // Morning activity (9am - 12pm)
          if (hour >= 9 && hour <= 12) {
            baseFrequency += 1;
          }

          // Random variation
          const frequency = Math.min(10, Math.max(0, baseFrequency + Math.floor(Math.random() * 3) - 1));

          if (frequency > 0) {
            patterns.push({
              dayOfWeek: day,
              hourOfDay: hour,
              frequency
            });
          }
        }
      }

      // Generate content preferences
      const contentTypes = ['meme', 'gif', 'video', 'image'];
      const contentPreferences = contentTypes.map(type => ({
        type,
        score: Math.floor(Math.random() * 100),
        reactionFrequency: Math.floor(Math.random() * 100)
      }));

      // Sort by score descending
      contentPreferences.sort((a, b) => b.score - a.score);

      // Generate targeting settings
      const targetingSettings = [
        {
          id: 'targeting-activity',
          name: 'Activity-Based Timing',
          enabled: Math.random() > 0.3,
          description: 'Send content when friend is most active'
        },
        {
          id: 'targeting-content',
          name: 'Content Type Matching',
          enabled: Math.random() > 0.3,
          description: 'Prioritize content types with highest engagement'
        },
        {
          id: 'targeting-frequency',
          name: 'Optimized Frequency',
          enabled: Math.random() > 0.3,
          description: 'Automatically adjust content frequency based on responses'
        },
        {
          id: 'targeting-weekday',
          name: 'Weekday Focus',
          enabled: Math.random() > 0.7,
          description: 'Focus content delivery on weekdays'
        },
        {
          id: 'targeting-weekend',
          name: 'Weekend Focus',
          enabled: Math.random() > 0.7,
          description: 'Focus content delivery on weekends'
        }
      ];

      const mockFriend: Friend = {
        id: friendId,
        name: `Friend ${friendId?.split('-')[1] || ''}`,
        avatarUrl: `https://randomuser.me/api/portraits/${parseInt(friendId?.split('-')[1] || '1') % 2 === 0 ? 'men' : 'women'}/${parseInt(friendId?.split('-')[1] || '1')}.jpg`,
        status: Math.random() > 0.5 ? 'online' : 'offline',
        activityPatterns: patterns,
        contentPreferences,
        targetingSettings,
        joinedAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
        contentSent: Math.floor(Math.random() * 200),
        contentReacted: Math.floor(Math.random() * 100),
        favoriteGames: ['Minecraft', 'Fortnite', 'League of Legends'].slice(0, Math.floor(Math.random() * 3) + 1),
        favoriteMusic: ['Pop', 'Rock', 'Electronic', 'Hip Hop'].slice(0, Math.floor(Math.random() * 4) + 1)
      };

      setFriendData(mockFriend);
    } else if (friend) {
      setFriendData(friend);
    }
  }, [friend, loading, friendId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDayName = (day: number) => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
  };

  const getHeatmapColor = (frequency: number) => {
    if (frequency <= 0) return 'bg-gray-200 dark:bg-gray-700';
    if (frequency <= 2) return 'bg-blue-100 dark:bg-blue-900';
    if (frequency <= 4) return 'bg-blue-200 dark:bg-blue-800';
    if (frequency <= 6) return 'bg-blue-300 dark:bg-blue-700';
    if (frequency <= 8) return 'bg-blue-400 dark:bg-blue-600';
    return 'bg-blue-500 dark:bg-blue-500';
  };

  const toggleTargetingSetting = (settingId: string) => {
    if (!friendData) return;

    const updatedSettings = friendData.targetingSettings.map(setting =>
      setting.id === settingId ? { ...setting, enabled: !setting.enabled } : setting
    );

    setFriendData({
      ...friendData,
      targetingSettings: updatedSettings
    });
  };

  const handleSaveSettings = async () => {
    if (!friendData || !onSettingsChanged) return;

    setIsSaving(true);

    try {
      await onSettingsChanged(friendData.id, {
        targetingSettings: friendData.targetingSettings
      });

      setSavingSuccess(true);
      setTimeout(() => setSavingSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeRangeChange = (range: '1d' | '7d' | '30d') => {
    setTimeRange(range);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!friendData) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Friend not found or no data available.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mr-3 p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Friend Details</h2>
        </div>
        <div>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : savingSuccess ? (
              <span className="flex items-center">
                <CheckIcon className="h-4 w-4 mr-1" />
                Saved
              </span>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center">
        <div className="flex items-center">
          <div className="relative h-16 w-16 rounded-full overflow-hidden">
            <img
              src={friendData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friendData.name)}&background=random`}
              alt={friendData.name}
              className="h-full w-full object-cover"
            />
            <span
              className={`absolute bottom-0 right-0 block h-4 w-4 rounded-full ring-2 ring-white dark:ring-gray-800 ${friendData.status === 'online' ? 'bg-green-500' :
                friendData.status === 'idle' ? 'bg-yellow-500' :
                  friendData.status === 'dnd' ? 'bg-red-500' :
                    'bg-gray-400'
                }`}
            ></span>
          </div>
          <div className="ml-4">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">{friendData.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Friend since {formatDate(friendData.joinedAt)}
            </p>
          </div>
        </div>
        <div className="flex mt-4 sm:mt-0 sm:ml-auto space-x-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{friendData.contentSent}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Content Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{friendData.contentReacted}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Reactions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {friendData.contentReacted > 0 ? Math.round((friendData.contentReacted / friendData.contentSent) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Response Rate</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 ${activeTab === 'patterns'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              Activity Patterns
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 ${activeTab === 'timeline'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Timeline
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 ${activeTab === 'preferences'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center">
              <ChartBarIcon className="h-4 w-4 mr-1" />
              Content Preferences
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('targeting')}
            className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 ${activeTab === 'targeting'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center">
              <CogIcon className="h-4 w-4 mr-1" />
              Targeting Settings
            </div>
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'patterns' && (
          <div>
            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Activity Heatmap</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Shows when this friend is typically active on Discord.
              </p>

              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {/* Hours header */}
                  <div className="flex">
                    <div className="w-10"></div>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className="w-6 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        {hour}
                      </div>
                    ))}
                  </div>

                  {/* Days and heatmap cells */}
                  {Array.from({ length: 7 }).map((_, day) => (
                    <div key={day} className="flex">
                      <div className="w-10 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        {getDayName(day)}
                      </div>
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const pattern = friendData.activityPatterns.find(p => p.dayOfWeek === day && p.hourOfDay === hour);
                        const frequency = pattern ? pattern.frequency : 0;

                        return (
                          <div
                            key={hour}
                            className={`w-6 h-6 m-px ${getHeatmapColor(frequency)}`}
                            title={`${getDayName(day)} ${hour}:00 - Frequency: ${frequency}/10`}
                          ></div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mt-2">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Less active</span>
                  <div className="flex mx-1">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900"></div>
                    <div className="w-4 h-4 bg-blue-200 dark:bg-blue-800"></div>
                    <div className="w-4 h-4 bg-blue-300 dark:bg-blue-700"></div>
                    <div className="w-4 h-4 bg-blue-400 dark:bg-blue-600"></div>
                    <div className="w-4 h-4 bg-blue-500 dark:bg-blue-500"></div>
                  </div>
                  <span>More active</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {friendData.favoriteGames && friendData.favoriteGames.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <BoltIcon className="h-4 w-4 mr-1 text-purple-500" />
                    Favorite Games
                  </h4>
                  <ul className="space-y-1">
                    {friendData.favoriteGames.map(game => (
                      <li key={game} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mr-2"></span>
                        {game}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {friendData.favoriteMusic && friendData.favoriteMusic.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <svg className="h-4 w-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path>
                    </svg>
                    Music Preferences
                  </h4>
                  <ul className="space-y-1">
                    {friendData.favoriteMusic.map(genre => (
                      <li key={genre} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></span>
                        {genre}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Activity Timeline</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    View all activities and events from this friend over time.
                  </p>
                </div>
                <div className="flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleTimeRangeChange('1d')}
                    className={`inline-flex items-center px-3 py-1.5 border ${timeRange === '1d'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                      : 'border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                      } text-sm font-medium rounded-l-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeRangeChange('7d')}
                    className={`inline-flex items-center px-3 py-1.5 border ${timeRange === '7d'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                      : 'border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                      } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeRangeChange('30d')}
                    className={`inline-flex items-center px-3 py-1.5 border ${timeRange === '30d'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                      : 'border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                      } text-sm font-medium rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    30 Days
                  </button>
                </div>
              </div>
            </div>

            <FriendActivityTimeline
              friendId={friendId}
              friendName={friendData?.name}
              timeRange={timeRange}
            />
          </div>
        )}

        {activeTab === 'preferences' && (
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Content Preferences</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Shows what types of content this friend engages with most.
            </p>

            <div className="space-y-6">
              {friendData.contentPreferences.map((pref) => (
                <div key={pref.type} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">{pref.type}</h4>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {pref.score}% engagement
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Engagement Score</span>
                      <span>{pref.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${pref.score}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Reaction Frequency</span>
                      <span>{pref.reactionFrequency}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${pref.reactionFrequency}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'targeting' && (
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Targeting Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Configure how content is delivered to this friend.
            </p>

            <div className="space-y-4">
              {friendData.targetingSettings.map((setting) => (
                <div key={setting.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{setting.name}</h4>
                      {setting.enabled && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Enabled
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{setting.description}</p>
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      onClick={() => toggleTargetingSetting(setting.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${setting.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      <span className="sr-only">Toggle {setting.name}</span>
                      <span
                        className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${setting.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      >
                        <span
                          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${setting.enabled ? 'opacity-0' : 'opacity-100'
                            }`}
                        >
                          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                            <path
                              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span
                          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${setting.enabled ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                          <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendDetailView; 