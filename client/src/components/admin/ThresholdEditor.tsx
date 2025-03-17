import React, { useState, useEffect } from 'react';
import { PerformanceAlertConfig } from '../../services/socketService';
import socketService from '../../services/socketService';
import api from '../../services/api';
import { formatValueWithUnit } from '../../utils/formatters';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// Make PerformanceAlertConfig compatible with SocketEventData
type SocketCompatibleConfig = PerformanceAlertConfig & {
  [key: string]: unknown;
};

// Metric details type for configuration
type MetricConfig = {
  id: string;
  name: string;
  warningId: string;
  criticalId: string;
  unit: string;
  defaultWarning: number;
  defaultCritical: number;
  min: number;
  max: number;
  step: number;
};

// Available metrics configuration
const metrics: MetricConfig[] = [
  {
    id: 'cpu',
    name: 'CPU Usage',
    warningId: 'cpuWarning',
    criticalId: 'cpuCritical',
    unit: '%',
    defaultWarning: 70,
    defaultCritical: 90,
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'memory',
    name: 'Memory Usage',
    warningId: 'memoryWarning',
    criticalId: 'memoryCritical',
    unit: '%',
    defaultWarning: 80,
    defaultCritical: 95,
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'disk',
    name: 'Disk Usage',
    warningId: 'diskWarning',
    criticalId: 'diskCritical',
    unit: '%',
    defaultWarning: 85,
    defaultCritical: 95,
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'load',
    name: 'System Load',
    warningId: 'loadWarning',
    criticalId: 'loadCritical',
    unit: '',
    defaultWarning: 2,
    defaultCritical: 5,
    min: 0,
    max: 10,
    step: 0.1
  },
  {
    id: 'network_rx',
    name: 'Network Download',
    warningId: 'network_rxWarning',
    criticalId: 'network_rxCritical',
    unit: 'B/s',
    defaultWarning: 1000000,
    defaultCritical: 10000000,
    min: 0,
    max: 20000000,
    step: 100000
  },
  {
    id: 'network_tx',
    name: 'Network Upload',
    warningId: 'network_txWarning',
    criticalId: 'network_txCritical',
    unit: 'B/s',
    defaultWarning: 1000000,
    defaultCritical: 10000000,
    min: 0,
    max: 20000000,
    step: 100000
  }
];

interface ThresholdEditorProps {
  alertConfig: PerformanceAlertConfig | null;
  onConfigUpdate: (config: PerformanceAlertConfig) => void;
}

const ThresholdEditor: React.FC<ThresholdEditorProps> = ({ alertConfig, onConfigUpdate }) => {
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize thresholds from alertConfig
  useEffect(() => {
    if (alertConfig && alertConfig.thresholds) {
      setThresholds(alertConfig.thresholds);
    }
  }, [alertConfig]);

  // Helper function to handle threshold changes
  const handleThresholdChange = (thresholdId: string, value: number) => {
    setThresholds(prev => {
      // Find if this is a warning or critical threshold
      const metric = metrics.find(m =>
        m.warningId === thresholdId || m.criticalId === thresholdId
      );

      if (!metric) {
        return { ...prev, [thresholdId]: value };
      }

      const isWarning = thresholdId === metric.warningId;
      const counterpartId = isWarning ? metric.criticalId : metric.warningId;
      const counterpartValue = prev[counterpartId] ||
        (isWarning ? metric.defaultCritical : metric.defaultWarning);

      // Enforce warning < critical
      if (isWarning && value > counterpartValue) {
        // If warning exceeds critical, cap it at critical
        return { ...prev, [thresholdId]: counterpartValue };
      } else if (!isWarning && value < counterpartValue) {
        // If critical is less than warning, cap it at warning
        return { ...prev, [thresholdId]: counterpartValue };
      }

      // Regular update if no constraints violated
      return { ...prev, [thresholdId]: value };
    });
  };

  // Save all thresholds
  const saveThresholds = async () => {
    if (!alertConfig) {
      setError('No alert configuration available');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const updatedConfig: SocketCompatibleConfig = {
        ...alertConfig,
        thresholds
      };

      // Send to server using API instead of socket
      const response = await api.admin.setPerformanceAlerts(updatedConfig);

      if (response.success) {
        setSuccess('Thresholds saved successfully');
        onConfigUpdate(updatedConfig);

        // Also update the local service's stored config
        await socketService.setPerformanceAlertConfig(updatedConfig);
      } else {
        throw new Error('Failed to save thresholds');
      }
    } catch (err) {
      console.error('Error saving thresholds:', err);
      setError(err instanceof Error ? err.message : 'Failed to save thresholds');
    }
  };

  // Reset all metrics to default values
  const resetAllToDefault = () => {
    const defaultThresholds: Record<string, number> = {};

    metrics.forEach(metric => {
      defaultThresholds[metric.warningId] = metric.defaultWarning;
      defaultThresholds[metric.criticalId] = metric.defaultCritical;
    });

    setThresholds(defaultThresholds);
  };

  // Render a metric threshold control
  const renderThresholdControl = (metric: MetricConfig) => {
    const warningValue = thresholds[metric.warningId] || metric.defaultWarning;
    const criticalValue = thresholds[metric.criticalId] || metric.defaultCritical;

    // Generate sample data for preview chart
    const sampleData = generateSampleData(metric.id, warningValue, criticalValue);

    // Format the displayed values properly
    const formattedWarningValue = formatValueWithUnit(warningValue, metric.unit);
    const formattedCriticalValue = formatValueWithUnit(criticalValue, metric.unit);

    return (
      <div className="mb-8 pb-6" key={metric.id}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{metric.name}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Unit: {metric.unit === 'B/s' ? 'Bytes/sec' : metric.unit}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          {/* Chart preview */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
            <div className="h-40">
              <Line
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      enabled: true,
                    },
                  },
                  scales: {
                    y: {
                      min: 0,
                      max: metric.max,
                      grid: {
                        color: 'rgba(160, 160, 160, 0.1)',
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                    },
                  },
                  elements: {
                    point: {
                      radius: 0,
                    },
                    line: {
                      tension: 0.4,
                    },
                  },
                }}
                data={sampleData}
              />
            </div>
            <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">Sample visualization with current thresholds</div>
          </div>

          {/* Threshold visualization bar */}
          <div>
            <div className="relative h-6 mt-4 mb-6 rounded-lg overflow-hidden">
              {/* Gradient background */}
              <div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: `linear-gradient(to right, 
                    rgba(16, 185, 129, 0.2) 0%, 
                    rgba(16, 185, 129, 0.2) ${(warningValue / metric.max) * 100}%, 
                    rgba(245, 158, 11, 0.3) ${(warningValue / metric.max) * 100}%, 
                    rgba(245, 158, 11, 0.3) ${(criticalValue / metric.max) * 100}%,
                    rgba(239, 68, 68, 0.3) ${(criticalValue / metric.max) * 100}%,
                    rgba(239, 68, 68, 0.3) 100%)`
                }}
              ></div>

              {/* Warning threshold marker */}
              <div
                className="absolute h-full z-10 transition-all duration-300"
                style={{ left: `${(warningValue / metric.max) * 100}%` }}
              >
                <div className="absolute -top-5 -left-3 bg-amber-500 text-white text-xs px-1 py-0.5 rounded">
                  {metric.id.includes('network') ? formatValueWithUnit(warningValue, metric.unit, 0) : warningValue}
                </div>
              </div>

              {/* Critical threshold marker */}
              <div
                className="absolute h-full z-10 transition-all duration-300"
                style={{ left: `${(criticalValue / metric.max) * 100}%` }}
              >
                <div className="absolute -top-5 -left-3 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
                  {metric.id.includes('network') ? formatValueWithUnit(criticalValue, metric.unit, 0) : criticalValue}
                </div>
              </div>

              {/* Severity labels */}
              <div className="absolute bottom-0 left-0 right-0 flex text-[10px] text-gray-700 dark:text-gray-300">
                <div style={{ width: `${(warningValue / metric.max) * 100}%` }} className="text-center">Healthy</div>
                <div style={{ width: `${(criticalValue - warningValue) / metric.max * 100}%` }} className="text-center">Warning</div>
                <div style={{ flex: 1 }} className="text-center">Critical</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Warning threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Warning Threshold
                  </label>
                  <span className="text-amber-500 font-medium">{formattedWarningValue}</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="range"
                    min={metric.min}
                    max={criticalValue}
                    step={metric.step}
                    value={warningValue}
                    onChange={(e) => handleThresholdChange(metric.warningId, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:bg-gray-700"
                  />
                  <button
                    onClick={() => handleThresholdChange(metric.warningId, metric.defaultWarning)}
                    className="ml-2 text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Critical threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Critical Threshold
                  </label>
                  <span className="text-red-500 font-medium">{formattedCriticalValue}</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="range"
                    min={warningValue}
                    max={metric.max}
                    step={metric.step}
                    value={criticalValue}
                    onChange={(e) => handleThresholdChange(metric.criticalId, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500 dark:bg-gray-700"
                  />
                  <button
                    onClick={() => handleThresholdChange(metric.criticalId, metric.defaultCritical)}
                    className="ml-2 text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <p>{getMetricDescription(metric.id)}</p>
        </div>
      </div>
    );
  };

  // Generate sample data for the chart preview
  const generateSampleData = (metricId: string, warningValue: number, criticalValue: number) => {
    const labels = Array.from({ length: 12 }, (_, i) => `${i * 5}m`);

    // Find the metric config to get max value
    const metric = metrics.find(m => m.id === metricId) || {
      max: 100,
      min: 0,
      step: 1
    };

    // Generate a reasonable pattern based on the metric type
    let values: number[];

    switch (metricId) {
      case 'cpu':
        // CPU typically has spikes and valleys
        values = [25, 32, 38, 45, 82, 65, 48, 75, 92, 86, 78, 65];
        break;
      case 'memory':
        // Memory tends to grow more steadily
        values = [45, 48, 52, 55, 62, 68, 75, 82, 85, 88, 92, 94];
        break;
      case 'disk':
        // Disk usage generally increases gradually
        values = [65, 65, 66, 67, 67, 68, 70, 72, 75, 78, 82, 85];
        break;
      case 'network_rx':
      case 'network_tx':
        // Network tends to have random spikes
        values = [
          Math.random() * 0.4 * metric.max,
          Math.random() * 0.2 * metric.max,
          Math.random() * 0.8 * metric.max,
          Math.random() * 0.3 * metric.max,
          Math.random() * 0.5 * metric.max,
          Math.random() * 0.9 * metric.max,
          Math.random() * 0.4 * metric.max,
          Math.random() * 0.6 * metric.max,
          Math.random() * 0.3 * metric.max,
          Math.random() * 0.7 * metric.max,
          Math.random() * 0.5 * metric.max,
          Math.random() * 0.8 * metric.max,
        ];
        break;
      case 'load':
        // Load typically has smoother transitions
        values = [0.8, 1.2, 1.5, 1.8, 2.3, 2.8, 3.5, 4.2, 3.8, 3.2, 2.5, 2.1];
        break;
      default:
        // Generic pattern
        values = Array.from({ length: 12 }, () => Math.random() * metric.max);
    }

    return {
      labels,
      datasets: [
        {
          label: metricId,
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          borderWidth: 2,
        },
        // Warning threshold line
        {
          label: 'Warning',
          data: Array(12).fill(warningValue),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
        },
        // Critical threshold line
        {
          label: 'Critical',
          data: Array(12).fill(criticalValue),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [3, 3],
          fill: false,
          pointRadius: 0,
        },
      ],
    };
  };

  // Helper to get appropriate descriptions for each metric
  const getMetricDescription = (metricId: string): string => {
    switch (metricId) {
      case 'cpu':
        return 'CPU usage represents the percentage of processor time being used. High values may indicate processing bottlenecks.';
      case 'memory':
        return 'Memory usage shows percentage of RAM currently in use. High values may lead to performance degradation or application crashes.';
      case 'disk':
        return 'Disk usage indicates percentage of storage space being used. Critical levels could prevent data writes and system operations.';
      case 'network_rx':
        return 'Network download rate in bytes per second. High thresholds may help detect unusual download activity.';
      case 'network_tx':
        return 'Network upload rate in bytes per second. High thresholds may help detect unusual upload activity.';
      case 'load':
        return 'System load average represents the number of processes waiting for CPU time. High values indicate system overload.';
      default:
        return 'Set appropriate warning and critical thresholds for this metric to receive alerts when values exceed acceptable ranges.';
    }
  };

  if (!alertConfig) {
    return <div>Loading alert configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Alert Threshold Configuration
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 dark:bg-red-900/30 dark:border-red-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 dark:bg-green-900/30 dark:border-green-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                {success}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={saveThresholds}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save All Thresholds
        </button>
        <button
          onClick={resetAllToDefault}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset All to Default
        </button>
      </div>

      <div className="space-y-6">
        {metrics.map(metric => renderThresholdControl(metric))}
      </div>
    </div>
  );
};

export default ThresholdEditor; 