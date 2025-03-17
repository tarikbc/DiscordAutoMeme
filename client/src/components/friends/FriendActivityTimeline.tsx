import { useState, useEffect, useRef } from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ActivityEvent {
  id: string;
  type: 'GAME' | 'MUSIC' | 'STREAMING' | 'WATCHING' | 'CONTENT_SENT' | 'CONTENT_RECEIVED';
  title: string;
  details?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // Duration in minutes
  contentId?: string;
}

interface FriendActivityTimelineProps {
  friendId?: string;
  friendName?: string;
  events?: ActivityEvent[];
  loading?: boolean;
  onContentClick?: (contentId: string) => void;
  timeRange?: '1d' | '7d' | '30d';
}

const FriendActivityTimeline = ({
  friendId,
  friendName = 'Friend',
  events = [],
  loading = false,
  onContentClick,
  timeRange = '7d',
}: FriendActivityTimelineProps) => {
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(events);
  const [groupedEvents, setGroupedEvents] = useState<{ date: string; events: ActivityEvent[] }[]>(
    [],
  );
  const mockDataGeneratedRef = useRef(false);

  // Mock data for development
  useEffect(() => {
    if (events.length === 0 && !loading && friendId && !mockDataGeneratedRef.current) {
      mockDataGeneratedRef.current = true;
      const mockEvents: ActivityEvent[] = [];
      const now = new Date();
      const dayCount = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;

      // Generate random events for the time range
      for (let i = 0; i < dayCount; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Random number of events per day (0-5)
        const eventsPerDay = Math.floor(Math.random() * 6);

        for (let j = 0; j < eventsPerDay; j++) {
          const hour = Math.floor(Math.random() * 16) + 8; // 8 AM to 11 PM
          date.setHours(hour, Math.floor(Math.random() * 60));

          const eventTypes: ActivityEvent['type'][] = [
            'GAME',
            'MUSIC',
            'STREAMING',
            'WATCHING',
            'CONTENT_SENT',
            'CONTENT_RECEIVED',
          ];
          const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

          let title = '';
          let details = '';
          let duration = 0;

          switch (type) {
            case 'GAME':
              title = ['Minecraft', 'Fortnite', 'League of Legends', 'Valorant', 'Among Us'][
                Math.floor(Math.random() * 5)
              ];
              details = `Played ${title} for ${Math.floor(Math.random() * 3) + 1} hours`;
              duration = Math.floor(Math.random() * 180) + 30; // 30-210 minutes
              break;
            case 'MUSIC':
              title = ['Spotify', 'Apple Music', 'YouTube Music'][Math.floor(Math.random() * 3)];
              details = `Listened to music on ${title}`;
              duration = Math.floor(Math.random() * 120) + 20; // 20-140 minutes
              break;
            case 'STREAMING':
              title = ['Twitch', 'YouTube'][Math.floor(Math.random() * 2)];
              details = `Streamed on ${title}`;
              duration = Math.floor(Math.random() * 240) + 60; // 60-300 minutes
              break;
            case 'WATCHING':
              title = ['Netflix', 'Disney+', 'YouTube'][Math.floor(Math.random() * 3)];
              details = `Watched content on ${title}`;
              duration = Math.floor(Math.random() * 180) + 30; // 30-210 minutes
              break;
            case 'CONTENT_SENT':
              title = 'Content Sent';
              details = 'Sent a meme';
              break;
            case 'CONTENT_RECEIVED':
              title = 'Content Received';
              details = 'Received a meme and reacted with 👍';
              break;
          }

          const startTime = date.toISOString();
          let endTime;

          if (duration > 0) {
            const endDate = new Date(date);
            endDate.setMinutes(endDate.getMinutes() + duration);
            endTime = endDate.toISOString();
          }

          mockEvents.push({
            id: `event-${i}-${j}`,
            type,
            title,
            details,
            startTime,
            endTime,
            duration,
            contentId:
              type === 'CONTENT_SENT' || type === 'CONTENT_RECEIVED'
                ? `content-${Math.floor(Math.random() * 100)}`
                : undefined,
          });
        }
      }

      // Sort events by startTime in descending order (newest first)
      mockEvents.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      setActivityEvents(mockEvents);
    }
  }, [events, loading, friendId, timeRange]);

  // Group events by date
  useEffect(() => {
    const grouped: { [date: string]: ActivityEvent[] } = {};

    activityEvents.forEach(event => {
      const dateStr = new Date(event.startTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }

      grouped[dateStr].push(event);
    });

    const result = Object.entries(grouped).map(([date, events]) => ({ date, events }));
    setGroupedEvents(result);
  }, [activityEvents]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }

    return `${mins}m`;
  };

  const getEventColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'GAME':
        return 'bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'MUSIC':
        return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'STREAMING':
        return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'WATCHING':
        return 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'CONTENT_SENT':
        return 'bg-indigo-100 border-indigo-500 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
      case 'CONTENT_RECEIVED':
        return 'bg-pink-100 border-pink-500 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'GAME':
        return (
          <svg
            className="h-5 w-5 text-purple-500 dark:text-purple-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
          </svg>
        );
      case 'MUSIC':
        return (
          <svg
            className="h-5 w-5 text-green-500 dark:text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path>
          </svg>
        );
      case 'STREAMING':
        return (
          <svg
            className="h-5 w-5 text-red-500 dark:text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            ></path>
          </svg>
        );
      case 'WATCHING':
        return (
          <svg
            className="h-5 w-5 text-blue-500 dark:text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
          </svg>
        );
      case 'CONTENT_SENT':
        return (
          <svg
            className="h-5 w-5 text-indigo-500 dark:text-indigo-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
          </svg>
        );
      case 'CONTENT_RECEIVED':
        return (
          <svg
            className="h-5 w-5 text-pink-500 dark:text-pink-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
              clipRule="evenodd"
            ></path>
          </svg>
        );
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const handleContentClick = (contentId: string) => {
    if (onContentClick && contentId) {
      onContentClick(contentId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activityEvents.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No activity found for {friendName} in the selected time period.
        </div>
      ) : (
        <div className="relative p-4">
          {groupedEvents.map(group => (
            <div key={group.date} className="mb-8 last:mb-0">
              <div className="sticky top-0 z-10 mb-3 bg-white dark:bg-gray-800 py-2 flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">{group.date}</h3>
              </div>

              <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pb-2">
                {group.events.map(event => (
                  <div
                    key={event.id}
                    className={`relative mb-4 last:mb-0 pl-6 ${event.contentId ? 'cursor-pointer hover:opacity-90' : ''}`}
                    onClick={() => event.contentId && handleContentClick(event.contentId)}
                  >
                    <div
                      className={`absolute left-[-9px] top-2 w-4 h-4 rounded-full border-2 ${getEventColor(event.type)}`}
                    ></div>

                    <div className={`p-3 rounded-md border-l-4 ${getEventColor(event.type)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getEventIcon(event.type)}
                          <h4 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </h4>
                        </div>
                        <div className="flex items-center">
                          {event.duration && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                              {formatDuration(event.duration)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(event.startTime)}
                          </span>
                        </div>
                      </div>
                      {event.details && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          {event.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendActivityTimeline;
