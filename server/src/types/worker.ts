import { ActivityType } from "discord.js-selfbot-v13";
import { IDiscordAccountSettings } from "@/models/DiscordAccount";

export interface ActivityState {
  type: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";
  details: {
    gameName?: string;
    musicDetails?: {
      artist: string;
      song: string;
      album?: string;
    };
    streamingDetails?: {
      platform: string;
      title: string;
      url?: string;
    };
    watchingDetails?: {
      title: string;
      platform?: string;
    };
    customDetails?: {
      name: string;
      state?: string;
    };
    competingDetails?: {
      name: string;
      venue?: string;
    };
    startedAt: Date;
  };
}

export interface WorkerPresenceEvent {
  friendId: string;
  accountId: string;
  oldActivity: ActivityState | null;
  newActivity: ActivityState | null;
  timestamp: string;
}

export type WorkerMessageType =
  | "worker:message"
  | "worker:status"
  | "worker:error"
  | "worker:presence"
  | "worker:metrics"
  | "worker:exit"
  | "START"
  | "STOP"
  | "UPDATE_SETTINGS"
  | "CONTENT_DELIVERY"
  | "STATUS"
  | "ERROR"
  | "PRESENCE_UPDATE";

export type WorkerMessage =
  | { type: "STATUS"; data: { accountId: string; status: WorkerStatus } }
  | { type: "ERROR"; data: { accountId: string; error: WorkerError } }
  | {
      type: "PRESENCE_UPDATE";
      data: {
        accountId: string;
        userId: string;
        oldActivity: ActivityState | null;
        newActivity: ActivityState | null;
        timestamp: string;
      };
    }
  | { type: "UPDATE_SETTINGS"; data: { accountId: string; settings: IDiscordAccountSettings } }
  | ContentDeliveryCommand
  | { type: "START" | "STOP"; data: { accountId: string } };

export interface WorkerStatus {
  isConnected: boolean;
  hasError?: boolean;
  friendCount?: number;
  lastError?: string;
  memoryUsage?: number;
  uptime?: number;
  reconnectAttempts?: number;
}

export interface WorkerError {
  name: string;
  message: string;
  stack?: string;
  context?: any;
}

export interface WorkerPresenceData {
  userId: string;
  username: string;
  oldActivity?: {
    type: ActivityType;
    name: string;
    details?: string;
    state?: string;
  };
  newActivity?: {
    type: ActivityType;
    name: string;
    details?: string;
    state?: string;
  };
}

export interface WorkerMetrics {
  activitiesDetected: number;
  activitiesProcessed: number;
  contentDelivered: number;
  errors: number;
  averageProcessingTime: number;
  cooldownSkips: number;
  memoryUsage: number;
  uptime: number;
  threadCount?: number;
  requestsPerMinute?: number;
  errorRate?: number;
}

export interface WorkerResponse {
  type: "STATUS" | "ERROR" | "PRESENCE_UPDATE" | "METRICS";
  data: {
    accountId: string;
    status?: WorkerStatus;
    error?: WorkerError;
    presence?: WorkerPresenceData;
    metrics?: WorkerMetrics;
  };
}

export interface ContentDeliveryCommand {
  type: "CONTENT_DELIVERY";
  data: {
    friendId: string;
    content: {
      url: string;
      title: string;
      source?: string;
      type?: string;
    };
    context: {
      type: "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING" | "GAME" | "MUSIC";
      trigger: string;
    };
    historyId: string;
  };
}
