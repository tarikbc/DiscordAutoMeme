/**
 * Format bytes to human-readable format (B, KB, MB, GB)
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Format bytes per second (network rates)
 */
export const formatBytesPerSecond = (bytesPerSecond: number, decimals = 2): string => {
  return `${formatBytes(bytesPerSecond, decimals)}/s`;
};

/**
 * Format time duration in seconds to human-readable format
 */
export const formatDuration = (seconds: number, decimals = 1): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(0)} sec`;
  } else if (seconds < 3600) {
    return `${(seconds / 60).toFixed(0)} min`;
  } else if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(decimals)} hours`;
  } else {
    return `${(seconds / 86400).toFixed(decimals)} days`;
  }
};

/**
 * Format a value based on its unit type
 */
export const formatValueWithUnit = (value: number, unit: string, decimals = 2): string => {
  // Handle bytes per second
  if (unit === 'B/s') {
    return formatBytesPerSecond(value, decimals);
  }

  // Handle durations in seconds
  if (unit === 's') {
    return formatDuration(value, decimals);
  }

  // Format numbers based on size
  if (value >= 100) {
    return `${value.toFixed(0)}${unit}`;
  } else if (value >= 10) {
    return `${value.toFixed(1)}${unit}`;
  } else {
    return `${value.toFixed(decimals)}${unit}`;
  }
};
