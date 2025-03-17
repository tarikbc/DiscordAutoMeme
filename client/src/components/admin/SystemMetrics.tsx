import { useState, useEffect } from 'react';
import useSocket from '../../hooks/useSocket';
import {
  ChartPieIcon,
  ServerIcon,
  CpuChipIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CircleStackIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Interface matching server's SystemMetrics
interface SystemMetrics {
  cpuUsage: number;
  cpuTemp: number;
  cpuCores: number;
  memoryUsage: number;
  memoryFree: number;
  memoryTotal: number;
  uptime: number;
  loadAverage: number[];
  networkRx: number;
  networkTx: number;
  networkRxSec: number;
  networkTxSec: number;
  diskUsage: number;
  diskFree: number;
  diskTotal: number;
  timestamp: string;
  [key: string]: unknown; // Add index signature to satisfy SocketEventData
}

const SystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { on, emitWithAck, isConnected } = useSocket();

  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format time in seconds to human-readable duration
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  };

  // Subscribe to performance metrics when component mounts
  useEffect(() => {
    if (!isConnected) return;

    const subscribeToMetrics = async () => {
      try {
        const response = await emitWithAck('subscribe_performance', {});

        if (response.success) {
          setIsSubscribed(true);
          setError(null);
        } else {
          setError('Failed to subscribe to metrics: ' + (response.error || 'Unknown error'));
          setIsSubscribed(false);
        }
      } catch {
        setError('Failed to subscribe to metrics');
        setIsSubscribed(false);
      }
    };

    subscribeToMetrics();

    // Unsubscribe when component unmounts
    return () => {
      if (isConnected && isSubscribed) {
        emitWithAck('unsubscribe_performance', {})
          .catch(e => console.error('Error unsubscribing from performance metrics:', e));
      }
    };
  }, [isConnected, emitWithAck]);

  // Listen for performance metrics events
  useEffect(() => {
    if (!isConnected || !isSubscribed) return;

    // Handler for performance metrics updates
    const handleMetricsUpdate = (data: SystemMetrics) => {
      setMetrics(data);
    };

    // Register event handler
    const unsubscribe = on<SystemMetrics>('performance_metrics', handleMetricsUpdate);

    // Also listen for regular system status updates
    const unsubscribeStatus = on<SystemMetrics>('system_status', handleMetricsUpdate);

    // Cleanup on unmount
    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, [isConnected, isSubscribed, on]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              Error loading metrics
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-200">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Performance</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CPU Usage */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <CpuChipIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">CPU</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Usage</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.cpuUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${metrics.cpuUsage > 80 ? 'bg-red-500' :
                    metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Temperature</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.cpuTemp}°C</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Cores</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.cpuCores}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Load Average</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {metrics.loadAverage.map(load => load.toFixed(2)).join(' | ')}
                </span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <ChartPieIcon className="h-6 w-6 text-purple-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Memory</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Usage</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.memoryUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${metrics.memoryUsage > 80 ? 'bg-red-500' :
                    metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.memoryUsage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Free</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.memoryFree.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.memoryTotal.toFixed(2)} GB</span>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <CircleStackIcon className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Disk</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Usage</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.diskUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${metrics.diskUsage > 90 ? 'bg-red-500' :
                    metrics.diskUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.diskUsage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Free</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.diskFree.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.diskTotal.toFixed(2)} GB</span>
              </div>
            </div>
          </div>

          {/* Network Usage */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <ServerIcon className="h-6 w-6 text-indigo-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Network</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowDownIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Download</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatBytes(metrics.networkRxSec)}/s</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowUpIcon className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Upload</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatBytes(metrics.networkTxSec)}/s</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Downloaded</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatBytes(metrics.networkRx)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Uploaded</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatBytes(metrics.networkTx)}</span>
              </div>
            </div>
          </div>

          {/* System Uptime */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <ClockIcon className="h-6 w-6 text-orange-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">System</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Uptime</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatUptime(metrics.uptime)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Server Time</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(metrics.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400">
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

export default SystemMetrics; 