import mongoose, { Document, Schema } from "mongoose";

/**
 * Performance alert configuration interface
 */
export interface IPerformanceAlertConfig extends Document {
  userId: string;
  enabled: boolean;
  triggers: {
    [metricId: string]: boolean;
  };
  thresholds: {
    [metricId: string]: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Performance alert configuration schema
 */
const performanceAlertConfigSchema = new Schema<IPerformanceAlertConfig>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    triggers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    thresholds: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Get the default alert configuration for a user
 */
export function getDefaultAlertConfig(userId: string): Partial<IPerformanceAlertConfig> {
  return {
    userId,
    enabled: true,
    triggers: {
      cpu: true,
      memory: true,
      disk: true,
      network_rx: true,
      network_tx: true,
      load: true,
    },
    thresholds: {
      cpuWarning: 70,
      cpuCritical: 90,
      memoryWarning: 80,
      memoryCritical: 95,
      diskWarning: 85,
      diskCritical: 95,
      network_rxWarning: 1000000, // 1MB/s
      network_rxCritical: 10000000, // 10MB/s
      network_txWarning: 1000000, // 1MB/s
      network_txCritical: 10000000, // 10MB/s
      loadWarning: 2,
      loadCritical: 5,
    },
  };
}

// Create the model
const PerformanceAlertConfig = mongoose.model<IPerformanceAlertConfig>(
  "PerformanceAlertConfig",
  performanceAlertConfigSchema,
  "performancealertconfigs",
);

export default PerformanceAlertConfig;
