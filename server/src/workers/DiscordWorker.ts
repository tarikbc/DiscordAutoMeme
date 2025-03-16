import { parentPort, workerData } from "worker_threads";
import { Client, ClientOptions, Presence } from "discord.js-selfbot-v13";
import logger from "../utils/logger";
import { IDiscordAccountSettings } from "../models/DiscordAccount";
import {
  ActivityState,
  WorkerMessage,
  WorkerMetrics,
  ContentDeliveryCommand,
} from "../types/worker";

export class DiscordWorker {
  private client: Client;
  private accountId: string;
  private token: string;
  private settings: IDiscordAccountSettings;
  private isShuttingDown: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private lastActivities: Map<string, ActivityState> = new Map();
  private metrics: WorkerMetrics = {
    activitiesDetected: 0,
    activitiesProcessed: 0,
    contentDelivered: 0,
    errors: 0,
    averageProcessingTime: 0,
    cooldownSkips: 0,
    memoryUsage: 0,
    uptime: 0,
    threadCount: 1,
    requestsPerMinute: 0,
    errorRate: 0,
  };

  constructor(accountId: string, token: string, settings: IDiscordAccountSettings) {
    this.accountId = accountId;
    this.token = token;
    this.settings = settings;
    this.client = new Client({
      checkUpdate: false,
      presence: {
        status: "invisible",
      },
      ws: {
        properties: {
          $browser: "Discord iOS",
        },
      },
    } as ClientOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on("ready", () => {
      logger.info({
        message: "Discord client ready",
        accountId: this.accountId,
        username: this.client.user?.tag,
      });

      this.sendToParent({
        type: "STATUS",
        data: {
          accountId: this.accountId,
          status: { isConnected: true },
        },
      });
    });

    this.client.on("error", error => {
      logger.error({
        message: "Discord client error",
        accountId: this.accountId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        reconnectAttempts: this.reconnectAttempts,
        maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
      });

      this.handleError(error);
    });

    this.client.on("disconnect", () => {
      logger.warn({
        message: "Discord client disconnected",
        accountId: this.accountId,
        isShuttingDown: this.isShuttingDown,
        reconnectAttempts: this.reconnectAttempts,
      });

      if (!this.isShuttingDown && this.settings.autoReconnect) {
        this.handleDisconnect();
      }
    });

    this.client.on("debug", info => {
      logger.debug({
        message: "Discord client debug",
        accountId: this.accountId,
        info,
      });
    });

    this.client.on("warn", info => {
      logger.warn({
        message: "Discord client warning",
        accountId: this.accountId,
        info,
      });
    });

    // Handle presence updates
    this.client.on(
      "presenceUpdate",
      (oldPresence: Presence | null, newPresence: Presence | null) => {
        if (!newPresence) return; // Skip if no new presence
        try {
          this.handlePresenceUpdate(oldPresence, newPresence);
        } catch (error) {
          logger.error("Error handling presence update:", error);
          this.handleError(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
  }

  private handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
    const startTime = Date.now();
    try {
      this.metrics.activitiesDetected++;

      const friendId = newPresence.userId;
      const currentActivity = this.extractActivity(newPresence);
      const lastActivity = this.lastActivities.get(friendId) || null;

      // Skip if no meaningful change
      if (this.isSameActivity(lastActivity, currentActivity)) {
        this.metrics.cooldownSkips++;
        return;
      }

      // Update stored state
      if (currentActivity) {
        this.lastActivities.set(friendId, currentActivity);
      } else {
        this.lastActivities.delete(friendId);
      }

      // Send activity event to parent thread
      this.sendToParent({
        type: "PRESENCE_UPDATE",
        data: {
          accountId: this.accountId,
          userId: newPresence.userId,
          oldActivity: lastActivity,
          newActivity: currentActivity,
          timestamp: new Date().toISOString(),
        },
      });

      this.metrics.activitiesProcessed++;
      this.updateProcessingTime(Date.now() - startTime);
    } catch (error) {
      logger.error("Error in handlePresenceUpdate:", error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private extractActivity(presence: Presence): ActivityState | null {
    const activities = presence.activities;
    if (!activities.length) return null;

    for (const activity of activities) {
      const startedAt = activity.createdAt || new Date();

      switch (activity.type) {
        case "PLAYING": {
          const game = activity.name;
          return {
            type: "GAME",
            details: {
              gameName: game,
              startedAt,
            },
          };
        }
        case "LISTENING": {
          const artist = activity.details;
          const song = activity.name;

          return {
            type: "MUSIC",
            details: {
              musicDetails: {
                artist: artist || "",
                song: song,
                album: activity.assets?.largeText || undefined,
              },
              startedAt,
            },
          };
        }
        case "STREAMING": {
          const platform = activity.name;
          const details = activity.details;
          return {
            type: "STREAMING",
            details: {
              streamingDetails: {
                platform: platform,
                title: details || platform,
                url: activity.url || undefined,
              },
              startedAt,
            },
          };
        }
        case "WATCHING": {
          const content = activity.name;
          const details = activity.details;
          return {
            type: "WATCHING",
            details: {
              watchingDetails: {
                title: content,
                platform: details || undefined,
              },
              startedAt,
            },
          };
        }
        case "CUSTOM":
          return {
            type: "CUSTOM",
            details: {
              customDetails: {
                name: activity.name,
                state: activity.state || undefined,
              },
              startedAt,
            },
          };
        case "COMPETING": {
          const competition = activity.name;
          const details = activity.details;
          return {
            type: "COMPETING",
            details: {
              competingDetails: {
                name: competition,
                venue: details || undefined,
              },
              startedAt,
            },
          };
        }
        default:
          break;
      }
    }

    return null;
  }

  private isSameActivity(
    oldActivity: ActivityState | null,
    newActivity: ActivityState | null,
  ): boolean {
    if (!oldActivity && !newActivity) return true;
    if (!oldActivity || !newActivity) return false;

    if (oldActivity.type !== newActivity.type) return false;

    switch (oldActivity.type) {
      case "GAME":
        return oldActivity.details.gameName === newActivity.details.gameName;

      case "MUSIC": {
        const oldMusic = oldActivity.details.musicDetails;
        const newMusic = newActivity.details.musicDetails;
        return oldMusic?.artist === newMusic?.artist && oldMusic?.song === newMusic?.song;
      }

      case "STREAMING": {
        const oldStream = oldActivity.details.streamingDetails;
        const newStream = newActivity.details.streamingDetails;
        return oldStream?.platform === newStream?.platform && oldStream?.title === newStream?.title;
      }

      case "WATCHING": {
        const oldWatch = oldActivity.details.watchingDetails;
        const newWatch = newActivity.details.watchingDetails;
        return oldWatch?.title === newWatch?.title && oldWatch?.platform === newWatch?.platform;
      }

      case "CUSTOM": {
        const oldCustom = oldActivity.details.customDetails;
        const newCustom = newActivity.details.customDetails;
        return oldCustom?.name === newCustom?.name && oldCustom?.state === newCustom?.state;
      }

      case "COMPETING": {
        const oldCompete = oldActivity.details.competingDetails;
        const newCompete = newActivity.details.competingDetails;
        return oldCompete?.name === newCompete?.name && oldCompete?.venue === newCompete?.venue;
      }
    }
  }

  private updateProcessingTime(processingTime: number) {
    const oldTotal = this.metrics.averageProcessingTime * (this.metrics.activitiesProcessed - 1);
    this.metrics.averageProcessingTime =
      (oldTotal + processingTime) / this.metrics.activitiesProcessed;
  }

  public handleError(error: Error) {
    this.metrics.errors++;
    this.sendToParent({
      type: "ERROR",
      data: {
        accountId: this.accountId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
    });

    if (!this.isShuttingDown && this.settings.autoReconnect) {
      this.handleDisconnect();
    }
  }

  private async handleDisconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error({
        message: "Max reconnection attempts reached",
        accountId: this.accountId,
        attempts: this.reconnectAttempts,
      });

      this.sendToParent({
        type: "ERROR",
        data: {
          accountId: this.accountId,
          error: {
            name: "MaxReconnectError",
            message: "Maximum reconnection attempts reached",
          },
        },
      });
      return;
    }

    this.reconnectAttempts++;
    logger.info({
      message: "Attempting to reconnect",
      accountId: this.accountId,
      attempt: this.reconnectAttempts,
      delay: this.RECONNECT_DELAY,
    });

    await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));

    try {
      await this.connect();
      this.reconnectAttempts = 0; // Reset counter on successful connection
    } catch (error) {
      logger.error({
        message: "Reconnection attempt failed",
        accountId: this.accountId,
        attempt: this.reconnectAttempts,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });

      await this.handleDisconnect(); // Try again
    }
  }

  private sendToParent(message: WorkerMessage) {
    if (parentPort) {
      try {
        parentPort.postMessage(message);
      } catch (error) {
        logger.error({
          message: "Error sending message to parent",
          accountId: this.accountId,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
          attemptedMessage: message,
        });
      }
    }
  }

  public async connect() {
    try {
      logger.info({
        message: "Connecting Discord client",
        accountId: this.accountId,
      });

      await this.client.login(this.token);
    } catch (error) {
      logger.error({
        message: "Failed to connect Discord client",
        accountId: this.accountId,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });
      throw error;
    }
  }

  public async disconnect() {
    this.isShuttingDown = true;
    logger.info({
      message: "Disconnecting Discord client",
      accountId: this.accountId,
    });

    try {
      await this.client.destroy();
      logger.info({
        message: "Discord client disconnected successfully",
        accountId: this.accountId,
      });
    } catch (error) {
      logger.error({
        message: "Error disconnecting Discord client",
        accountId: this.accountId,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });
      throw error;
    }
  }

  public updateSettings(newSettings: IDiscordAccountSettings) {
    logger.info({
      message: "Updating Discord client settings",
      accountId: this.accountId,
      oldSettings: this.settings,
      newSettings,
    });

    this.settings = newSettings;
  }

  public async handleCommand(command: ContentDeliveryCommand) {
    try {
      const friend = await this.client.users.fetch(command.data.friendId);
      if (!friend) {
        throw new Error(`Friend ${command.data.friendId} not found`);
      }

      await friend.send({
        content: `Found this ${command.data.content.type} related to ${command.data.context.trigger}:`,
        embeds: [
          {
            title: command.data.content.title,
            url: command.data.content.url,
            footer: {
              text: `Source: ${command.data.content.source}`,
            },
          },
        ],
      });

      this.metrics.contentDelivered++;
    } catch (error) {
      logger.error("Error sending content:", error);
      this.handleError(error as Error);
      throw error;
    }
  }

  public getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }
}

// Worker thread entry point
if (parentPort) {
  const { accountId, token, settings } = workerData;
  const worker = new DiscordWorker(accountId, token, settings);

  parentPort.on("message", async (message: WorkerMessage) => {
    logger.debug({
      message: "Received message in worker",
      accountId,
      messageType: message.type,
    });

    try {
      switch (message.type) {
        case "START":
          await worker.connect();
          break;

        case "STOP":
          await worker.disconnect();
          if (parentPort) parentPort.close();
          break;

        case "UPDATE_SETTINGS":
          worker.updateSettings(message.data.settings);
          break;

        case "CONTENT_DELIVERY":
          await worker.handleCommand(message);
          break;

        default:
          logger.warn({
            message: "Unknown message type received",
            accountId,
            messageType: message.type,
          });
      }
    } catch (error) {
      logger.error({
        message: "Error handling worker message",
        accountId,
        messageType: message.type,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });

      if (error instanceof Error) {
        worker.handleError(error);
      } else {
        worker.handleError(new Error(String(error)));
      }
    }
  });
}
