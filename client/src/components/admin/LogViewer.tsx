import { useState, useEffect, useRef } from 'react';
import {
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import useSocket from '../../hooks/useSocket';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  component: string;
  message: string;
  details?: string;
}

interface LogFilter {
  level: string;
  component: string;
  startDate: string;
  endDate: string;
  searchQuery: string;
}

interface LogViewerProps {
  maxHeight?: string;
}

interface LogResponse {
  logs: LogEntry[];
  components: string[];
  total: number;
}

// Request sent to the server
interface FetchLogsRequest {
  level?: string;
  component?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  limit?: number;
  [key: string]: unknown; // Add index signature to satisfy SocketEventData constraint
}

// Response received from the server
interface LogsResponse {
  success: boolean;
  logs?: LogResponse;
  error?: string;
  [key: string]: unknown; // Add index signature to satisfy SocketEventData constraint
}

const LogViewer = ({ maxHeight = '600px' }: LogViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [availableComponents, setAvailableComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const logListRef = useRef<HTMLUListElement>(null);
  const MAX_LOG_COUNT = 200;

  const defaultFilters = {
    level: 'all',
    component: 'all',
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    searchQuery: '',
  };

  const [filters, setFilters] = useState<LogFilter>({ ...defaultFilters });

  // Check if filters are at their default values
  const hasActiveFilters = () => {
    return (
      filters.level !== defaultFilters.level ||
      filters.component !== defaultFilters.component ||
      filters.startDate !== defaultFilters.startDate ||
      filters.endDate !== defaultFilters.endDate ||
      filters.searchQuery !== defaultFilters.searchQuery
    );
  };

  // Initialize socket connection
  const { on, emitWithAck, isConnected } = useSocket();

  // Toggle live updates
  const toggleLiveUpdates = async () => {
    try {
      if (!isConnected) return;

      const newLiveState = !isLive;
      setIsLive(newLiveState);

      // If turning off live updates, unsubscribe from logs
      if (!newLiveState && isSubscribed) {
        await emitWithAck('unsubscribe_logs', {});
        setIsSubscribed(false);
      }
      // If turning on live updates, subscribe to logs
      else if (newLiveState && !isSubscribed) {
        const response = await emitWithAck('subscribe_logs', { isAdmin: true });
        if (response.success) {
          setIsSubscribed(true);
        } else {
          setError('Failed to subscribe to logs: ' + (response.error || 'Unknown error'));
        }
      }
    } catch {
      // Catch any errors and set a generic error message
      setError('Failed to toggle live updates');
    }
  };

  // Subscribe to logs when component mounts and unsubscribe when it unmounts
  useEffect(() => {
    if (!isConnected) return;

    const subscribeToLogs = async () => {
      try {
        // Only subscribe if live updates are enabled
        if (isLive) {
          // Subscribe to logs
          const response = await emitWithAck('subscribe_logs', { isAdmin: true });

          if (response.success) {
            setIsSubscribed(true);
          } else {
            setError('Failed to subscribe to logs: ' + (response.error || 'Unknown error'));
            setIsSubscribed(false);
          }
        }
      } catch {
        // Catch any errors and set a generic error message
        setError('Failed to subscribe to logs');
        setIsSubscribed(false);
      }
    };

    subscribeToLogs();

    // Unsubscribe when component unmounts
    return () => {
      if (isConnected && isSubscribed) {
        emitWithAck('unsubscribe_logs', {})
          .catch(e => console.error('Error unsubscribing from logs:', e));
      }
    };
  }, [isConnected, emitWithAck, isLive]);

  // Fetch initial logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isConnected) {
          setLoading(false);
          setError('Socket not connected. Logs will load when the connection is established.');
          return;
        }

        // Fetch logs with current filters
        const request: FetchLogsRequest = {
          ...filters,
          limit: MAX_LOG_COUNT,
        };

        const response = await emitWithAck<FetchLogsRequest, LogsResponse>('fetch_logs', request);

        if (response.success && response.logs) {
          setLogs(response.logs.logs);
          setFilteredLogs(response.logs.logs);
          setAvailableComponents(response.logs.components || []);
        } else {
          setError('Failed to fetch logs: ' + (response.error || 'Unknown error'));
        }
      } catch (err) {
        setError('Failed to fetch logs: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    if (isSubscribed) {
      fetchLogs();
    }
  }, [isConnected, filters.startDate, filters.endDate, emitWithAck, filters, isSubscribed]);

  // Listen for log stream events
  useEffect(() => {
    if (!isConnected || !isSubscribed) {
      return;
    }

    // Handler for new log entries
    const handleLogStream = (data: unknown) => {
      // Skip if live updates are paused
      if (isLive) {
        setLogs(prevLogs => {
          // Safely handle different possible data formats
          let newLogs: LogEntry[] = [];

          if (Array.isArray(data)) {
            newLogs = data as LogEntry[];
          } else if (data && typeof data === 'object') {
            if ('logs' in data && Array.isArray((data as Record<string, unknown>).logs)) {
              newLogs = (data as { logs: LogEntry[] }).logs;
            } else {
              // Assuming it's a single log entry
              newLogs = [data as LogEntry];
            }
          }

          if (newLogs.length === 0) {
            return prevLogs;
          }

          // Add new logs at the beginning
          const updatedLogs = [...newLogs, ...prevLogs];

          // Limit to MAX_LOG_COUNT
          return updatedLogs.slice(0, MAX_LOG_COUNT);
        });
      }
    };

    // Handler for initial logs data
    const handleLogsData = (data: unknown) => {
      // Type guard to check if data has the right structure
      if (data && typeof data === 'object' && 'logs' in data && Array.isArray((data as Record<string, unknown>).logs)) {
        const logsData = data as { logs: LogEntry[] };
        setLogs(logsData.logs);
        setFilteredLogs(logsData.logs);
      }
      setLoading(false);
    };

    // Handler for log errors
    const handleLogError = (data: unknown) => {
      if (data && typeof data === 'object' && 'error' in data) {
        setError(String((data as { error: string }).error));
      } else {
        setError('Unknown error occurred');
      }
      setLoading(false);
    };

    // Register event handlers
    const unsubscribeStream = on<Record<string, unknown>>('log_stream', handleLogStream);
    const unsubscribeData = on<Record<string, unknown>>('logs_data', handleLogsData);
    const unsubscribeError = on<Record<string, unknown>>('logs_error', handleLogError);

    // Clean up on unmount
    return () => {
      unsubscribeStream();
      unsubscribeData();
      unsubscribeError();
    };
  }, [isConnected, isLive, on, isSubscribed]);

  // Apply filters whenever the filter state changes or logs change
  useEffect(() => {
    let result = [...logs];

    // Filter by level
    if (filters.level !== 'all') {
      result = result.filter(log => log.level === filters.level);
    }

    // Filter by component
    if (filters.component !== 'all') {
      result = result.filter(log => log.component === filters.component);
    }

    // Filter by date range
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      result = result.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        log =>
          log.message.toLowerCase().includes(query) ||
          (log.details && log.details.toLowerCase().includes(query)),
      );
    }

    setFilteredLogs(result);
  }, [logs, filters]);

  // Scroll to bottom of log list when new logs are added
  useEffect(() => {
    if (logListRef.current && filteredLogs.length > 0 && isLive) {
      const scrollContainer = logListRef.current.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = 0; // Scroll to top since newest logs are at the top
      }
    }
  }, [filteredLogs.length, isLive]);

  const handleFilterChange = (key: keyof LogFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is already being handled by the useEffect
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'debug':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const exportLogs = () => {
    try {
      const data = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      setError('Failed to export logs');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Log Viewer</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleLiveUpdates}
              className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLive
                ? 'border-green-500 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700'
                }`}
              title={isLive ? "Live updates are enabled" : "Live updates are disabled"}
            >
              {isLive ? 'Live: On' : 'Live: Off'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={exportLogs}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label
                  htmlFor="level-filter"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Log Level
                </label>
                <select
                  id="level-filter"
                  value={filters.level}
                  onChange={e => handleFilterChange('level', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="flex-1">
                <label
                  htmlFor="component-filter"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Component
                </label>
                <select
                  id="component-filter"
                  value={filters.component}
                  onChange={e => handleFilterChange('component', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Components</option>
                  {availableComponents.map(component => (
                    <option key={component} value={component}>
                      {component}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label
                  htmlFor="start-date"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Start Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    id="start-date"
                    value={filters.startDate}
                    onChange={e => handleFilterChange('startDate', e.target.value)}
                    className="block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label
                  htmlFor="end-date"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  End Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    id="end-date"
                    value={filters.endDate}
                    onChange={e => handleFilterChange('endDate', e.target.value)}
                    className="block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <form onSubmit={handleSearch} className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    type="text"
                    value={filters.searchQuery}
                    onChange={e => handleFilterChange('searchQuery', e.target.value)}
                    className="block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search logs..."
                  />
                  {filters.searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange('searchQuery', '')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon
                        className="h-5 w-5 text-gray-400 hover:text-gray-500"
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Search
                </button>
              </form>
            </div>

            {hasActiveFilters() && (
              <div>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ maxHeight }} className="overflow-auto">
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                    Error loading logs
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && filteredLogs.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">
                {logs.length === 0
                  ? "No logs available. Check your connection or wait for logs to be generated."
                  : "No logs found matching your filters."}
              </p>
              {logs.length > 0 && hasActiveFilters() && (
                <button
                  onClick={resetFilters}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredLogs.length > 0 && (
            <ul ref={logListRef} className="space-y-3 p-1">
              {filteredLogs.map(log => (
                <li
                  key={log.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
                    <div className="flex-shrink-0">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelBadgeColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                      {log.component}
                    </div>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {log.message}
                  </p>
                  {log.details && (
                    <details className="mt-2">
                      <summary className="text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer">
                        Show details
                      </summary>
                      <pre className="mt-2 p-3 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                        {log.details}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredLogs.length} of {logs.length} logs
        {isConnected ? (
          <span className="ml-2 text-green-600 dark:text-green-400">● Connected</span>
        ) : (
          <span className="ml-2 text-red-600 dark:text-red-400">● Disconnected</span>
        )}
        {isSubscribed ? (
          <span className="ml-2 text-green-600 dark:text-green-400">● Receiving updates</span>
        ) : (
          <span className="ml-2 text-yellow-600 dark:text-yellow-400">● Not subscribed to updates</span>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
