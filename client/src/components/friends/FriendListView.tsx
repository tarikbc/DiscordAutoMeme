import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, BoltIcon, ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Activity {
  type: 'GAME' | 'MUSIC' | 'STREAMING' | 'WATCHING' | 'ONLINE' | 'OFFLINE' | 'IDLE';
  details?: string;
  startTime?: string;
  endTime?: string;
}

interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  currentActivity?: Activity;
  lastSeen?: string;
  contentSent: number;
  contentReacted: number;
}

interface FriendListViewProps {
  initialFriends?: Friend[];
  loading?: boolean;
  onFriendSelect?: (friendId: string) => void;
  onFriendTimelineView?: (friendId: string) => void;
}

const FriendListView = ({ initialFriends = [], loading = false, onFriendSelect, onFriendTimelineView }: FriendListViewProps) => {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>(initialFriends);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const mockDataGeneratedRef = useRef(false);

  // Mock data for development
  useEffect(() => {
    if (initialFriends.length === 0 && !loading && !mockDataGeneratedRef.current) {
      mockDataGeneratedRef.current = true;

      const activityTypes: Activity['type'][] = ['GAME', 'MUSIC', 'STREAMING', 'WATCHING', 'ONLINE', 'OFFLINE', 'IDLE'];
      const statuses: Friend['status'][] = ['online', 'offline', 'idle', 'dnd'];

      const mockFriends: Friend[] = Array.from({ length: 15 }, (_, i) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const lastSeen = new Date();
        lastSeen.setHours(lastSeen.getHours() - Math.floor(Math.random() * 48));

        // Activity details based on type
        let activityDetails = '';
        switch (activityType) {
          case 'GAME':
            activityDetails = ['Minecraft', 'Fortnite', 'League of Legends', 'Valorant', 'Among Us'][Math.floor(Math.random() * 5)];
            break;
          case 'MUSIC':
            activityDetails = ['Spotify', 'Apple Music', 'YouTube Music'][Math.floor(Math.random() * 3)];
            break;
          case 'STREAMING':
            activityDetails = ['Twitch', 'YouTube'][Math.floor(Math.random() * 2)];
            break;
          case 'WATCHING':
            activityDetails = ['Netflix', 'Disney+', 'YouTube'][Math.floor(Math.random() * 3)];
            break;
          default:
            activityDetails = '';
        }

        return {
          id: `friend-${i + 1}`,
          name: `Friend ${i + 1}`,
          avatarUrl: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${(i % 10) + 1}.jpg`,
          status,
          currentActivity: activityType !== 'OFFLINE' ? {
            type: activityType,
            details: activityDetails,
            startTime: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString()
          } : undefined,
          lastSeen: status === 'offline' ? lastSeen.toISOString() : undefined,
          contentSent: Math.floor(Math.random() * 100),
          contentReacted: Math.floor(Math.random() * 50)
        };
      });

      setFriends(mockFriends);
      setFilteredFriends(mockFriends);
    }
  }, [initialFriends, loading]);

  // Apply filters
  useEffect(() => {
    let filtered = [...friends];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(friend =>
        statusFilter === 'online'
          ? friend.status === 'online' || friend.status === 'idle' || friend.status === 'dnd'
          : friend.status === 'offline'
      );
    }

    setFilteredFriends(filtered);
  }, [friends, searchQuery, statusFilter]);

  const getStatusColor = (status: Friend['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'dnd':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getActivityIcon = (activity?: Activity) => {
    if (!activity) return null;

    switch (activity.type) {
      case 'GAME':
        return <BoltIcon className="h-4 w-4 text-purple-500" />;
      case 'MUSIC':
        return <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path></svg>;
      case 'STREAMING':
        return <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path></svg>;
      case 'WATCHING':
        return <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path></svg>;
      case 'IDLE':
      case 'ONLINE':
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatActivityDescription = (activity?: Activity) => {
    if (!activity) return 'Offline';

    switch (activity.type) {
      case 'GAME':
        return `Playing ${activity.details}`;
      case 'MUSIC':
        return `Listening to music on ${activity.details}`;
      case 'STREAMING':
        return `Streaming on ${activity.details}`;
      case 'WATCHING':
        return `Watching content on ${activity.details}`;
      case 'IDLE':
        return 'Idle';
      case 'ONLINE':
        return 'Online';
      case 'OFFLINE':
        return 'Offline';
      default:
        return 'Unknown activity';
    }
  };

  const formatTimeSince = (dateString?: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const handleFriendClick = (friendId: string) => {
    if (onFriendSelect) {
      onFriendSelect(friendId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Friends</h2>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <div className="relative rounded-md shadow-sm flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md py-2 shadow-sm"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <select
              id="status-filter"
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
            >
              <option value="all">All Friends</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No friends found with the current filters.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredFriends.map((friend) => (
            <li
              key={friend.id}
              className="relative hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => handleFriendClick(friend.id)}
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <div className="relative flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random`}
                        alt={friend.name}
                      />
                      <span
                        className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${getStatusColor(friend.status)}`}
                      ></span>
                    </div>
                    <div className="ml-4 truncate">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{friend.name}</h3>
                        {friend.status === 'offline' && friend.lastSeen && (
                          <span className="ml-2 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                            Last seen {formatTimeSince(friend.lastSeen)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {getActivityIcon(friend.currentActivity)}
                        <span className="ml-1 truncate">{formatActivityDescription(friend.currentActivity)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center">
                    <div className="mr-4 flex flex-col items-end">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-blue-600 dark:text-blue-400">{friend.contentSent}</span> sent
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-green-600 dark:text-green-400">{friend.contentReacted}</span> reacted
                      </span>
                      {onFriendTimelineView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFriendTimelineView(friend.id);
                          }}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Timeline
                        </button>
                      )}
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendListView; 