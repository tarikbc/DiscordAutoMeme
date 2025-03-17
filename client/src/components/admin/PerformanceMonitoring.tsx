import { useState, useEffect } from 'react';
import useSocket from '../../hooks/useSocket';
import socketService, { PerformanceAlertConfig } from '../../services/socketService';
import api from '../../services/api';
import { formatBytesPerSecond } from '../../utils/formatters';
import {
  BellIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'rc-slider/assets/index.css';
import ThresholdEditor from './ThresholdEditor';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  history: {
    timestamp: string;
    value: number;
  }[];
}

// Define the dataset type to include borderDash
interface ExtendedDataset {
  label?: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  borderWidth: number;
  pointBackgroundColor?: string;
  pointHoverBackgroundColor?: string;
  pointRadius?: number;
  borderDash?: number[];
}

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
  [key: string]: unknown;
}

// Create a handler type for the system alert
interface SystemAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
  [key: string]: unknown; // Add index signature to satisfy SocketEventData
}

const PerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alertConfig, setAlertConfig] = useState<PerformanceAlertConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState<Map<string, { timestamp: string; value: number }[]>>(new Map());
  const [activeTab, setActiveTab] = useState<'metrics' | 'thresholds'>('metrics');
  const { on, emitWithAck, isConnected } = useSocket();

  // Load the alert configuration from socketService
  useEffect(() => {
    if (!isConnected) return;

    // Make sure socket is authenticated before trying to get alert config
    const fetchAlertConfig = async () => {
      try {
        // Get user ID or token from localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('No auth token found, cannot authenticate socket');
          return;
        }

        // Authenticate socket connection with properly typed object
        const result = await emitWithAck('authenticate', { token });
        if (result.success) {
          console.log('Socket authenticated successfully');

          // Get alert config after authentication
          const alertConfig = socketService.getPerformanceAlertConfig();
          if (alertConfig) {
            console.log('Alert config loaded from cache:', alertConfig);
            setAlertConfig(alertConfig);
            setError(null);
          } else {
            // If no config in memory, request it from API
            try {
              const config = await api.admin.getPerformanceAlerts();
              console.log('Alert config fetched from API:', config);
              setAlertConfig(config);

              // Also update the local cache
              socketService.setPerformanceAlertConfig(config);
              setError(null);
            } catch (err) {
              console.warn('Failed to get alert config from API:', err);
              setError('Failed to load alert configuration');
            }
          }
        } else {
          console.error('Socket authentication failed:', result.error);
          setError('Authentication failed - cannot load alert configuration');
        }
      } catch (err) {
        console.error('Error during socket authentication:', err);
        setError('Failed to authenticate socket connection');
      }
    };

    fetchAlertConfig();
  }, [isConnected, emitWithAck]);

  // Add handler for system alerts
  useEffect(() => {
    if (!isConnected) return;

    // Handler for system alerts (which may indicate config changes)
    const handleSystemAlert = (alert: SystemAlert) => {
      console.log('System alert received:', alert);

      // Refresh the alert config when alerts are triggered
      const alertConfig = socketService.getPerformanceAlertConfig();
      if (alertConfig) {
        setAlertConfig(alertConfig);
      }
    };

    // Register event handler
    const unsubscribe = on<SystemAlert>('system_alert', handleSystemAlert);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [isConnected, on]);

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

  // Convert SystemMetrics to PerformanceMetric array
  const convertToPerformanceMetrics = (systemMetrics: SystemMetrics): PerformanceMetric[] => {
    const now = new Date();
    const metricsArray: PerformanceMetric[] = [];

    // Helper function to determine status based on threshold
    const getStatus = (value: number, metricId: string): 'healthy' | 'warning' | 'critical' => {
      if (!alertConfig) return 'healthy';

      // Check if alerts are enabled for this metric
      if (!alertConfig.triggers[metricId]) return 'healthy';

      // Get the warning threshold from config or default
      const warningThreshold = alertConfig.thresholds[`${metricId}Warning`] ||
        socketService.getDefaultThreshold(metricId, 'warning');

      // Get the critical threshold from config or default
      const criticalThreshold = alertConfig.thresholds[`${metricId}Critical`] ||
        socketService.getDefaultThreshold(metricId, 'critical');

      // Check against thresholds in the correct order (critical first)
      if (value >= criticalThreshold) return 'critical';
      if (value >= warningThreshold) return 'warning';
      return 'healthy';
    };

    // Helper function to determine trend
    const getTrend = (currentValue: number, history: { timestamp: string; value: number }[]): { trend: 'up' | 'down' | 'stable'; changePercent: number } => {
      if (history.length < 2) return { trend: 'stable', changePercent: 0 };

      const oldValue = history[0].value;
      const changePercent = ((currentValue - oldValue) / oldValue) * 100;

      if (Math.abs(changePercent) < 1) return { trend: 'stable', changePercent };
      return {
        trend: changePercent > 0 ? 'up' : 'down',
        changePercent
      };
    };

    // Update history for each metric
    const updateHistory = (id: string, value: number) => {
      const history = metricsHistory.get(id) || [];
      const newHistory = [...history, { timestamp: now.toISOString(), value }];

      // Keep last 30 days of data
      if (newHistory.length > 30 * 24) {
        newHistory.shift();
      }

      return newHistory;
    };

    // CPU Metrics
    const cpuHistory = updateHistory('cpu', systemMetrics.cpuUsage);
    const cpuTrend = getTrend(systemMetrics.cpuUsage, cpuHistory);
    metricsArray.push({
      id: 'cpu',
      name: 'CPU Usage',
      value: systemMetrics.cpuUsage,
      unit: '%',
      status: getStatus(systemMetrics.cpuUsage, 'cpu'),
      trend: cpuTrend.trend,
      changePercent: cpuTrend.changePercent,
      history: cpuHistory
    });

    // Memory Metrics
    const memHistory = updateHistory('memory', systemMetrics.memoryUsage);
    const memTrend = getTrend(systemMetrics.memoryUsage, memHistory);
    metricsArray.push({
      id: 'memory',
      name: 'Memory Usage',
      value: systemMetrics.memoryUsage,
      unit: '%',
      status: getStatus(systemMetrics.memoryUsage, 'memory'),
      trend: memTrend.trend,
      changePercent: memTrend.changePercent,
      history: memHistory
    });

    // Disk Metrics
    const diskHistory = updateHistory('disk', systemMetrics.diskUsage);
    const diskTrend = getTrend(systemMetrics.diskUsage, diskHistory);
    metricsArray.push({
      id: 'disk',
      name: 'Disk Usage',
      value: systemMetrics.diskUsage,
      unit: '%',
      status: getStatus(systemMetrics.diskUsage, 'disk'),
      trend: diskTrend.trend,
      changePercent: diskTrend.changePercent,
      history: diskHistory
    });

    // Network Metrics (Download)
    const networkRxHistory = updateHistory('network_rx', systemMetrics.networkRxSec);
    const networkRxTrend = getTrend(systemMetrics.networkRxSec, networkRxHistory);
    metricsArray.push({
      id: 'network_rx',
      name: 'Network Download',
      value: systemMetrics.networkRxSec,
      unit: 'B/s',
      status: getStatus(systemMetrics.networkRxSec, 'network_rx'),
      trend: networkRxTrend.trend,
      changePercent: networkRxTrend.changePercent,
      history: networkRxHistory
    });

    // Network Metrics (Upload)
    const networkTxHistory = updateHistory('network_tx', systemMetrics.networkTxSec);
    const networkTxTrend = getTrend(systemMetrics.networkTxSec, networkTxHistory);
    metricsArray.push({
      id: 'network_tx',
      name: 'Network Upload',
      value: systemMetrics.networkTxSec,
      unit: 'B/s',
      status: getStatus(systemMetrics.networkTxSec, 'network_tx'),
      trend: networkTxTrend.trend,
      changePercent: networkTxTrend.changePercent,
      history: networkTxHistory
    });

    // Load Average
    const loadHistory = updateHistory('load', systemMetrics.loadAverage[0]);
    const loadTrend = getTrend(systemMetrics.loadAverage[0], loadHistory);
    metricsArray.push({
      id: 'load',
      name: 'Load Average',
      value: systemMetrics.loadAverage[0],
      unit: '',
      status: getStatus(systemMetrics.loadAverage[0], 'load'),
      trend: loadTrend.trend,
      changePercent: loadTrend.changePercent,
      history: loadHistory
    });

    // Update metrics history
    metricsArray.forEach(metric => {
      metricsHistory.set(metric.id, metric.history);
    });
    setMetricsHistory(new Map(metricsHistory));

    return metricsArray;
  };

  // Listen for performance metrics events
  useEffect(() => {
    if (!isConnected || !isSubscribed) return;

    // Handler for performance metrics updates
    const handleMetricsUpdate = (data: SystemMetrics) => {
      const performanceMetrics = convertToPerformanceMetrics(data);
      setMetrics(performanceMetrics);
      setError(null);
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

  // Get the real userId from the JWT token
  const getUserIdFromToken = (token: string): string => {
    try {
      // Simple JWT parsing - split by dots and decode the payload (second part)
      const parts = token.split('.');
      if (parts.length !== 3) return '';

      const payload = JSON.parse(atob(parts[1]));
      return payload.id || '';
    } catch (err) {
      console.error('Error parsing JWT token:', err);
      return '';
    }
  };

  // Update alert configuration using API service
  const toggleAlertEnabled = async (metricId: string) => {
    if (!alertConfig) {
      console.error('Cannot toggle alert - alertConfig is null');
      setError('Alert configuration not loaded');
      return;
    }

    try {
      console.log(`Toggling alert for ${metricId}. Current state:`, alertConfig.triggers[metricId]);
      console.log('Current full alertConfig:', JSON.stringify(alertConfig));

      // Extract the actual user ID instead of passing the token object
      const token = localStorage.getItem('auth_token') || '';
      const userId = getUserIdFromToken(token);

      if (!userId) {
        setError('Could not determine user ID from token');
        return;
      }

      // Check if alertConfig has the expected structure
      if (!Object.prototype.hasOwnProperty.call(alertConfig, 'triggers') ||
        !Object.prototype.hasOwnProperty.call(alertConfig, 'thresholds')) {
        console.error('Alert config is missing required properties, attempting to fix structure');

        // Create a properly structured config with correct userId
        const fixedConfig = {
          userId,
          enabled: true,
          triggers: {
            ...(alertConfig.triggers || {}),
            [metricId]: !(alertConfig.triggers?.[metricId] || false)
          },
          thresholds: alertConfig.thresholds || {
            cpuWarning: 70,
            cpuCritical: 90,
            memoryWarning: 80,
            memoryCritical: 95,
            diskWarning: 85,
            diskCritical: 95,
            network_rxWarning: 1000000,
            network_rxCritical: 10000000,
            network_txWarning: 1000000,
            network_txCritical: 10000000,
            loadWarning: 2,
            loadCritical: 5,
          }
        };

        setAlertConfig(fixedConfig);
        console.log('Setting fixed config:', fixedConfig);

        // Save via API
        const response = await api.admin.setPerformanceAlerts(fixedConfig);
        console.log('Config update response:', response);

        if (response.success) {
          await socketService.setPerformanceAlertConfig(fixedConfig);
          setError(null);
        } else {
          throw new Error('Failed to update alert configuration');
        }

        return;
      }

      // Get current state
      const isEnabled = alertConfig.triggers[metricId] || false;

      // Try using the specific toggle API first
      try {
        const response = await api.admin.togglePerformanceAlert(metricId, !isEnabled);

        if (response.success && response.config) {
          console.log('Alert toggle successful, new config:', response.config);
          setAlertConfig(response.config);
          await socketService.setPerformanceAlertConfig(response.config);
          setError(null);
          return;
        }

        // If toggle doesn't return a config, create one manually
        if (response.success) {
          // Create a new config with proper userId field
          const tempConfig = {
            ...alertConfig,
            userId,
            triggers: {
              ...alertConfig.triggers,
              [metricId]: !isEnabled
            }
          };

          setAlertConfig(tempConfig);
          await socketService.setPerformanceAlertConfig(tempConfig);
          setError(null);
        } else {
          throw new Error('Unknown error');
        }
      } catch (error) {
        console.error('Failed to toggle alert, trying fallback', error);

        // Fallback: update the entire config
        const tempConfig = {
          ...alertConfig,
          userId,
          triggers: {
            ...alertConfig.triggers,
            [metricId]: !isEnabled
          }
        };

        setAlertConfig(tempConfig);

        const response = await api.admin.setPerformanceAlerts(tempConfig);

        if (response.success) {
          await socketService.setPerformanceAlertConfig(tempConfig);
          setError(null);
        } else {
          throw new Error('Failed to update alert configuration');
        }
      }
    } catch (err) {
      console.error('Error updating alert config:', err);
      setError(`Failed to update alert configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);

      // Restore previous state on error by getting the current config from the service
      const currentConfig = socketService.getPerformanceAlertConfig();
      if (currentConfig) {
        setAlertConfig(currentConfig);
      }
    }
  };

  const getFilteredHistory = (history: PerformanceMetric['history']) => {
    // Filter history based on selected time range
    if (selectedTimeRange === '1h') {
      return history.slice(-2); // Last 2 data points
    } else if (selectedTimeRange === '24h') {
      return history.slice(-25); // Last 25 data points (24 hours)
    } else if (selectedTimeRange === '7d') {
      return history.filter((_, index) => index % 6 === 0).slice(-28); // 6-hour intervals for 7 days
    } else {
      // 30d
      return history.filter((_, index) => index % 24 === 0); // Daily points for 30 days
    }
  };

  // Format time for display in Chart.js tooltips and axis
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get color based on metric status
  const getStatusColor = (
    status: PerformanceMetric['status'],
  ): { border: string; background: string } => {
    switch (status) {
      case 'critical':
        return { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' }; // red-500
      case 'warning':
        return { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' }; // amber-500
      case 'healthy':
        return { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' }; // emerald-500
      default:
        return { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' }; // blue-500
    }
  };

  // Format value for display but keep the same return signature for backward compatibility
  const formatValue = (value: number, unit: string): { value: string, unit: string } => {
    // Format numbers to fixed decimal places
    if (unit === '%') {
      return { value: value.toFixed(1), unit };
    }
    // For byte units, use our shared formatter but extract value and unit parts
    else if (unit === 'B/s') {
      const formatted = formatBytesPerSecond(value);
      const parts = formatted.split(' ');
      // Extract the numeric part and the unit part
      return {
        value: parts[0],
        unit: parts.length > 1 ? parts[1] : 'B/s'
      };
    }
    // Format uptime
    else if (unit === 's') {
      if (value < 60) {
        return { value: value.toFixed(0), unit: 'sec' };
      } else if (value < 3600) {
        return { value: (value / 60).toFixed(0), unit: 'min' };
      } else if (value < 86400) {
        return { value: (value / 3600).toFixed(1), unit: 'hours' };
      } else {
        return { value: (value / 86400).toFixed(1), unit: 'days' };
      }
    }
    // Default formatting for other units or no unit
    else {
      if (value >= 100) {
        return { value: value.toFixed(0), unit };
      } else if (value >= 10) {
        return { value: value.toFixed(1), unit };
      } else {
        return { value: value.toFixed(2), unit };
      }
    }
  };

  // Configure Chart.js options for mini charts
  const getMiniChartOptions = (metric: PerformanceMetric): ChartOptions<'line'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context: TooltipItem<'line'>) => {
              const formattedValue = formatValue(context.parsed.y, metric.unit);
              let label = `${metric.name}: ${formattedValue.value}${formattedValue.unit}`;
              // Add labels for threshold lines
              if (context.dataset.label === 'Warning' || context.dataset.label === 'Critical') {
                label = `${context.dataset.label} Threshold: ${formattedValue.value}${formattedValue.unit}`;
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
          min: 0,
          // Add some headroom
          suggestedMax:
            Math.max(...getFilteredHistory(metric.history).map(item => item.value)) * 1.1,
          grid: {
            display: false,
          },
        },
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 3,
        },
        line: {
          tension: 0.3,
        },
      },
      animation: false,
    };
  };

  // Prepare Chart.js data for mini charts
  const getMiniChartData = (metric: PerformanceMetric) => {
    const filteredHistory = getFilteredHistory(metric.history);
    const color = getStatusColor(metric.status);

    // Get threshold values from alertConfig
    const warningThreshold = alertConfig?.thresholds?.[`${metric.id}Warning`] ||
      socketService.getDefaultThreshold(metric.id, 'warning');

    const criticalThreshold = alertConfig?.thresholds?.[`${metric.id}Critical`] ||
      socketService.getDefaultThreshold(metric.id, 'critical');

    const datasets: ExtendedDataset[] = [
      {
        data: filteredHistory.map(item => item.value),
        borderColor: color.border,
        backgroundColor: color.background,
        fill: true,
        borderWidth: 2,
      },
      // Add warning threshold line
      {
        label: 'Warning',
        data: Array(filteredHistory.length).fill(warningThreshold),
        borderColor: 'rgb(245, 158, 11)', // amber-500
        backgroundColor: 'transparent',
        fill: false,
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
      },
      // Add critical threshold line
      {
        label: 'Critical',
        data: Array(filteredHistory.length).fill(criticalThreshold),
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'transparent',
        fill: false,
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
      }
    ];

    return {
      labels: filteredHistory.map(item => formatTime(item.timestamp)),
      datasets,
    };
  };

  // Get color for status badges
  const getStatusBadgeColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Get icon for trend display
  const getTrendIcon = (metric: PerformanceMetric) => {
    const { trend, changePercent, id } = metric;
    // Format percentage with 1 decimal place
    const formattedPercent = Math.abs(changePercent).toFixed(1);

    // For resource usage metrics (CPU, memory, disk, load), down is good (green), up is bad (red)
    // For other metrics, we might need different logic
    const isResourceMetric = ['cpu', 'memory', 'disk', 'load'].includes(id);

    // Determine if this change is positive or negative
    const isPositiveChange = isResourceMetric
      ? trend === 'down'  // For resource metrics, down is good
      : trend === 'up';   // For other metrics (like network), up might be good

    // Set color based on whether change is positive or negative
    const colorClass = isPositiveChange
      ? 'text-green-500 dark:text-green-400'
      : 'text-red-500 dark:text-red-400';

    if (trend === 'up') {
      return (
        <div className={`flex items-center ${colorClass}`}>
          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
          <span>{formattedPercent}%</span>
        </div>
      );
    } else if (trend === 'down') {
      return (
        <div className={`flex items-center ${colorClass}`}>
          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
          <span>{formattedPercent}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <span>0.0%</span>
        </div>
      );
    }
  };

  // Add a more responsive alert toggle function
  const renderAlertToggle = (metricId: string) => {
    // Default to false if alertConfig is not loaded yet
    const isEnabled = alertConfig?.triggers?.[metricId] || false;

    // Show an active toggle class for better visibility
    const toggledClass = isEnabled
      ? 'bg-blue-600 dark:bg-blue-500'
      : 'bg-gray-200 dark:bg-gray-600';

    return (
      <button
        onClick={() => toggleAlertEnabled(metricId)}
        className={`relative inline-flex h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${toggledClass}`}
        aria-pressed={isEnabled}
        role="switch"
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
            }`}
          style={{ marginTop: '0.125rem' }}
        />
        <span className="sr-only">Toggle alerts</span>
      </button>
    );
  };

  const renderMetricCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metrics.map(metric => {
          const formattedValue = formatValue(metric.value, metric.unit);
          return (
            <div
              key={metric.id}
              className="bg-white dark:bg-gray-700 shadow-sm rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {metric.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(metric.status)}`}
                  >
                    {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between items-end">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formattedValue.value}
                    </span>
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                      {formattedValue.unit}
                    </span>
                  </div>

                  <div className="text-sm">{getTrendIcon(metric)}</div>
                </div>

                {/* Chart.js mini chart */}
                <div className="h-12 w-full mt-2">
                  <div style={{ height: '60px' }}>
                    <Line options={getMiniChartOptions(metric)} data={getMiniChartData(metric)} />
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    <ClockIcon className="inline h-3 w-3 mr-1" />
                    {selectedTimeRange}
                  </span>
                  <span>Last update: {new Date().toLocaleTimeString()}</span>
                </div>

                {/* Simplified alert toggle */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <BellIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alert Notifications
                      </span>
                    </div>
                    {renderAlertToggle(metric.id)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMetricTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Metric
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Value
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Trend
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Chart
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Alerts
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {metrics.map(metric => {
            const formattedValue = formatValue(metric.value, metric.unit);
            return (
              <tr key={metric.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {metric.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-baseline">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formattedValue.value}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {formattedValue.unit}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(metric.status)}`}
                  >
                    {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {getTrendIcon(metric)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-32 h-10">
                    <div style={{ height: '40px', width: '100%' }}>
                      <Line options={getMiniChartOptions(metric)} data={getMiniChartData(metric)} />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {renderAlertToggle(metric.id)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Handle alert config update from threshold editor
  const handleAlertConfigUpdate = (updatedConfig: PerformanceAlertConfig) => {
    setAlertConfig(updatedConfig);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'metrics'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics Dashboard
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'thresholds'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('thresholds')}
          >
            Alert Thresholds
          </button>
        </nav>
      </div>

      {activeTab === 'metrics' && (
        <>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Performance Monitoring
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex shadow-sm rounded-md">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-md ${viewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                      }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 text-sm font-medium rounded-r-md ${viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                      }`}
                  >
                    <TableCellsIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="ml-3 inline-flex shadow-sm rounded-md">
                  {['1h', '24h', '7d', '30d'].map(range => (
                    <button
                      key={range}
                      onClick={() => setSelectedTimeRange(range as '1h' | '24h' | '7d' | '30d')}
                      className={`px-3 py-2 text-sm font-medium ${range === selectedTimeRange
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                        } ${range === '1h' ? 'rounded-l-md' : ''} ${range === '30d' ? 'rounded-r-md' : ''
                        }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-red-500">{error}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
          )}

          <div className="p-6">{viewMode === 'cards' ? renderMetricCards() : renderMetricTable()}</div>
        </>
      )}

      {activeTab === 'thresholds' && (
        <div className="p-6">
          <ThresholdEditor
            alertConfig={alertConfig}
            onConfigUpdate={handleAlertConfigUpdate}
          />
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitoring;
