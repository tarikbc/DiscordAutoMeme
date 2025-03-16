import mongoose, { Document, Schema, Types } from "mongoose";

// Alert configuration interface
export interface IAlertConfig {
  userId: Types.ObjectId;
  enabled: boolean;
  channelType: "email" | "webhook";
  destination: string; // Email address or webhook URL
  triggers: {
    connectionLost: boolean;
    highErrorRate: boolean;
    tokenInvalid: boolean;
    rateLimited: boolean;
  };
  thresholds: {
    errorRateThreshold: number; // Errors per minute threshold
    disconnectionThreshold: number; // Disconnection count threshold in an hour
  };
  cooldown: number; // Minutes between alerts
  lastSent?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Alert history interface
export interface IAlertHistory extends Document {
  alertConfigId: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  alertType: "connectionLost" | "highErrorRate" | "tokenInvalid" | "rateLimited";
  message: string;
  data: any;
  resolved: boolean;
  resolvedAt?: Date;
  sentAt: Date;
}

// Alert configuration schema
const alertConfigSchema = new Schema<IAlertConfig>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    channelType: {
      type: String,
      enum: ["email", "webhook"],
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    triggers: {
      connectionLost: {
        type: Boolean,
        default: true,
      },
      highErrorRate: {
        type: Boolean,
        default: true,
      },
      tokenInvalid: {
        type: Boolean,
        default: true,
      },
      rateLimited: {
        type: Boolean,
        default: true,
      },
    },
    thresholds: {
      errorRateThreshold: {
        type: Number,
        default: 5, // 5 errors per minute
      },
      disconnectionThreshold: {
        type: Number,
        default: 3, // 3 disconnections in an hour
      },
    },
    cooldown: {
      type: Number,
      default: 15, // 15 minutes
    },
    lastSent: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Alert history schema
const alertHistorySchema = new Schema<IAlertHistory>(
  {
    alertConfigId: {
      type: Schema.Types.ObjectId,
      ref: "AlertConfig",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "DiscordAccount",
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      enum: ["connectionLost", "highErrorRate", "tokenInvalid", "rateLimited"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
alertConfigSchema.index({ userId: 1 });
alertHistorySchema.index({ userId: 1, accountId: 1 });
alertHistorySchema.index({ sentAt: -1 });
alertHistorySchema.index({ resolved: 1, sentAt: -1 });

export const AlertConfig = mongoose.model<IAlertConfig>("AlertConfig", alertConfigSchema);
export const AlertHistory = mongoose.model<IAlertHistory>("AlertHistory", alertHistorySchema);
