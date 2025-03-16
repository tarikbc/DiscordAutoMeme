import mongoose from "mongoose";

export interface ISystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  threadCount: number;
  activeClients: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
}

const systemMetricsSchema = new mongoose.Schema<ISystemMetrics>({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  cpuUsage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  memoryUsage: {
    total: {
      type: Number,
      required: true,
    },
    used: {
      type: Number,
      required: true,
    },
    free: {
      type: Number,
      required: true,
    },
  },
  threadCount: {
    type: Number,
    required: true,
    min: 0,
  },
  activeClients: {
    type: Number,
    required: true,
    min: 0,
  },
  activeUsers: {
    type: Number,
    required: true,
    min: 0,
  },
  requestsPerMinute: {
    type: Number,
    required: true,
    min: 0,
  },
  errorRate: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Add indexes
systemMetricsSchema.index({ timestamp: -1 });

// Add static methods
systemMetricsSchema.statics.getLatestMetrics = function () {
  return this.findOne().sort({ timestamp: -1 });
};

systemMetricsSchema.statics.getMetricsInRange = function (startTime: Date, endTime: Date) {
  return this.find({
    timestamp: {
      $gte: startTime,
      $lte: endTime,
    },
  }).sort({ timestamp: 1 });
};

export const SystemMetrics = mongoose.model<ISystemMetrics>("SystemMetrics", systemMetricsSchema);
