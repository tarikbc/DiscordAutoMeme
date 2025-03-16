import mongoose, { Document, Schema, Types } from "mongoose";
import { IUser } from "./User";

interface IDiscordAccountMethods {
  updateStatus(isConnected: boolean): Promise<void>;
  updateMetrics(metrics: Partial<IDiscordAccountMetrics>): Promise<void>;
}

interface IDiscordAccountStatus {
  isConnected: boolean;
  lastConnection: Date | null;
  lastDisconnection: Date | null;
  currentActivity: {
    type: string;
    name: string;
    details?: string;
  } | null;
}

interface IDiscordAccountMetrics {
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  uptime: number;
}

export interface IDiscordAccountSettings {
  autoReconnect: boolean;
  statusUpdateInterval: number;
  contentPreferences: {
    memes: boolean;
    gifs: boolean;
    quotes: boolean;
    news: boolean;
    jokes: boolean;
  };
  deliveryPreferences: {
    frequency: number;
    timeWindows: Array<{
      start: string;
      end: string;
    }>;
  };
}

export interface IDiscordAccount extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  name: string;
  token: string;
  isActive: boolean;
  settings: IDiscordAccountSettings;
  status: IDiscordAccountStatus;
  metrics: IDiscordAccountMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export type IDiscordAccountModel = IDiscordAccount & IDiscordAccountMethods;

const discordAccountSchema = new Schema<IDiscordAccountModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      autoReconnect: {
        type: Boolean,
        default: true,
      },
      statusUpdateInterval: {
        type: Number,
        default: 60000, // 1 minute
      },
      contentPreferences: {
        memes: {
          type: Boolean,
          default: true,
        },
        gifs: {
          type: Boolean,
          default: true,
        },
        quotes: {
          type: Boolean,
          default: true,
        },
        news: {
          type: Boolean,
          default: true,
        },
        jokes: {
          type: Boolean,
          default: true,
        },
      },
      deliveryPreferences: {
        frequency: {
          type: Number,
          default: 3600000, // 1 hour
        },
        timeWindows: {
          type: [
            {
              start: String,
              end: String,
            },
          ],
          default: [
            {
              start: "09:00",
              end: "17:00",
            },
          ],
        },
      },
    },
    status: {
      isConnected: {
        type: Boolean,
        default: false,
      },
      lastConnection: {
        type: Date,
        default: null,
      },
      lastDisconnection: {
        type: Date,
        default: null,
      },
      currentActivity: {
        type: Schema.Types.Mixed,
        default: undefined,
      },
    },
    metrics: {
      messagesSent: {
        type: Number,
        default: 0,
      },
      messagesReceived: {
        type: Number,
        default: 0,
      },
      errors: {
        type: Number,
        default: 0,
      },
      uptime: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes
discordAccountSchema.index({ userId: 1 });
discordAccountSchema.index({ isActive: 1 });

// Add instance methods
discordAccountSchema.methods.updateStatus = async function (
  this: IDiscordAccountModel,
  isConnected: boolean,
): Promise<void> {
  const now = new Date();
  if (isConnected) {
    this.status.isConnected = true;
    this.status.lastConnection = now;
  } else {
    this.status.isConnected = false;
    this.status.lastDisconnection = now;
  }
  await this.save();
};

discordAccountSchema.methods.updateMetrics = async function (
  this: IDiscordAccountModel,
  metrics: Partial<IDiscordAccountMetrics>,
): Promise<void> {
  Object.assign(this.metrics, metrics);
  await this.save();
};

export const DiscordAccount = mongoose.model<IDiscordAccountModel>(
  "DiscordAccount",
  discordAccountSchema,
);
