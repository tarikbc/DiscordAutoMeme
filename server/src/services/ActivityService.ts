import { Types } from "mongoose";
import logger from "../utils/logger";
import { ActivityHistory, IActivityHistory } from "../models/ActivityHistory";
import { Friend } from "../models/Friend";
import { ActivityState, WorkerPresenceEvent } from "../types/worker";
import { ContentService } from "./ContentService";

interface ProcessResult {
  shouldSendContent: boolean;
  cooldownMs?: number;
  contentType?: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";
  trigger?: string;
}

export class ActivityService {
  private static instance: ActivityService;
  private contentService: ContentService;
  private cooldowns: Map<string, Date> = new Map();
  private readonly DEFAULT_COOLDOWN = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.contentService = ContentService.getInstance();
  }

  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  public async processActivity(event: WorkerPresenceEvent): Promise<ProcessResult> {
    try {
      // Skip if no new activity
      if (!event.newActivity) {
        return { shouldSendContent: false };
      }

      // Log the activity
      const activity = await this.logActivity(event);

      // Check if we should process this activity
      if (!this.shouldProcessActivity(event.newActivity)) {
        return { shouldSendContent: false };
      }

      // Get friend settings
      const friend = await Friend.findOne({ userId: event.friendId });
      if (!friend || !friend.contentPreferences.enabledTypes.includes(event.newActivity.type)) {
        return { shouldSendContent: false };
      }

      // Check time restrictions
      if (!this.isWithinAllowedTime(friend.contentPreferences.timeRestrictions)) {
        return { shouldSendContent: false };
      }

      // Check cooldown
      const cooldownKey = `${event.accountId}:${event.friendId}`;
      if (this.isOnCooldown(cooldownKey)) {
        return {
          shouldSendContent: false,
          cooldownMs: this.getRemainingCooldown(cooldownKey),
        };
      }

      // Set cooldown
      this.setCooldown(cooldownKey);

      // Mark activity as processed
      await activity.markProcessed();

      return {
        shouldSendContent: true,
        contentType: event.newActivity.type,
        trigger: this.getTriggerFromActivity(event.newActivity),
      };
    } catch (error) {
      logger.error("Error processing activity:", error);
      throw error;
    }
  }

  private async logActivity(event: WorkerPresenceEvent): Promise<IActivityHistory> {
    const activity = new ActivityHistory({
      friendId: new Types.ObjectId(event.friendId),
      discordAccountId: new Types.ObjectId(event.accountId),
      type: event.newActivity?.type,
      details: event.newActivity?.details,
      processed: false,
    });

    await activity.save();
    return activity;
  }

  private isOnCooldown(key: string): boolean {
    const lastTime = this.cooldowns.get(key);
    if (!lastTime) return false;

    const now = new Date();
    return now.getTime() - lastTime.getTime() < this.DEFAULT_COOLDOWN;
  }

  private setCooldown(key: string): void {
    this.cooldowns.set(key, new Date());
  }

  private getRemainingCooldown(key: string): number {
    const lastTime = this.cooldowns.get(key);
    if (!lastTime) return 0;

    const now = new Date();
    const elapsed = now.getTime() - lastTime.getTime();
    return Math.max(0, this.DEFAULT_COOLDOWN - elapsed);
  }

  private shouldProcessActivity(activity: ActivityState): boolean {
    console.log("shouldProcessActivity", !!activity);
    // Add any additional validation logic here
    return true;
  }

  private isWithinAllowedTime(restrictions: { startHour: number; endHour: number }): boolean {
    if (!restrictions) return true;

    const now = new Date();
    const hour = now.getHours();

    if (restrictions.startHour <= restrictions.endHour) {
      return hour >= restrictions.startHour && hour < restrictions.endHour;
    } else {
      // Handle case where time range spans midnight
      return hour >= restrictions.startHour || hour < restrictions.endHour;
    }
  }

  private getTriggerFromActivity(activity: ActivityState): string {
    switch (activity.type) {
      case "GAME":
        return activity.details.gameName || "";
      case "MUSIC":
        return activity.details.musicDetails?.artist || "";
      case "STREAMING":
        return activity.details.streamingDetails?.title || "";
      case "WATCHING":
        return activity.details.watchingDetails?.title || "";
      case "CUSTOM":
        return activity.details.customDetails?.name || "";
      case "COMPETING":
        return activity.details.competingDetails?.name || "";
      default:
        return "";
    }
  }

  public getRecentActivityByAccountIds(
    accountIds: Types.ObjectId[],
    limit: number = 10,
  ): Promise<IActivityHistory[]> {
    return ActivityHistory.find({
      discordAccountId: { $in: accountIds },
      processed: true,
    })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  // Helper method to clean up old cooldowns
  private cleanupCooldowns(): void {
    const now = new Date().getTime();
    for (const [key, time] of this.cooldowns.entries()) {
      if (now - time.getTime() > this.DEFAULT_COOLDOWN) {
        this.cooldowns.delete(key);
      }
    }
  }

  // Start cooldown cleanup interval
  public startCleanupInterval(intervalMs: number = 60 * 60 * 1000): void {
    // Default: 1 hour
    setInterval(() => this.cleanupCooldowns(), intervalMs);
  }
}
