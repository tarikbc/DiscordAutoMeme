import { Client, ClientOptions, Presence } from "discord.js-selfbot-v13";
import { GameActivity, FriendWithGame } from "./types";
import { logger } from "./utils/logger";
import { t } from "./i18n";
import { EventEmitter } from "events";

export class DiscordClient extends EventEmitter {
  private client: Client;
  private ready: boolean = false;
  private friendsPlaying: Map<string, FriendWithGame> = new Map();
  private statusCheckInterval?: NodeJS.Timeout;
  private targetUserIds: Set<string> = new Set();

  constructor(token: string, targetUserIds?: string[]) {
    super(); // Initialize EventEmitter

    this.client = new Client({
      checkUpdate: false,
      presence: {
        status: "online",
      },
      ws: {
        properties: {
          $browser: "Discord iOS", // Mobile presence has better detection sometimes
        },
      },
    } as ClientOptions);

    if (targetUserIds) {
      targetUserIds.forEach((id) => this.targetUserIds.add(id));
    }

    this.initialize(token);
  }

  private initialize(token: string): void {
    this.client.on("ready", () => {
      this.ready = true;
      logger.info(
        t("discord:login.success", { username: this.client.user?.username })
      );

      // Initial check of friends after login
      this.checkFriendsStatus();

      // Set up periodic status checks every 30 seconds
      this.statusCheckInterval = setInterval(
        () => this.checkFriendsStatus(),
        30000
      );
    });

    this.client.on(
      "presenceUpdate",
      (oldPresence: Presence | null, newPresence: Presence) => {
        logger.debug(t("common:debug.presenceUpdateTriggered"));

        // If we have target user IDs, only process those users
        if (
          this.targetUserIds.size > 0 &&
          !this.targetUserIds.has(newPresence.userId)
        ) {
          return;
        }

        this.handlePresenceUpdate(newPresence);
      }
    );

    this.client.login(token).catch((err) => {
      logger.error(t("discord:login.failure"), err);
      process.exit(1);
    });
  }

  // Methods to manage target user IDs (can be updated at runtime)
  public setTargetUserIds(userIds: string[] | undefined): void {
    this.targetUserIds.clear();
    if (userIds) {
      userIds.forEach((id) => this.targetUserIds.add(id));
    }
    logger.info(
      t(
        this.targetUserIds.size > 1
          ? "discord:friends.targetUsersUpdated"
          : "discord:friends.targetUserUpdated",
        {
          count: this.targetUserIds.size,
          userIds: Array.from(this.targetUserIds).join(", ") || "none",
        }
      )
    );
  }

  public addTargetUserId(userId: string): void {
    this.targetUserIds.add(userId);
    logger.info(
      t("discord:friends.targetUserAdded", {
        userId,
        count: this.targetUserIds.size,
      })
    );
  }

  public removeTargetUserId(userId: string): void {
    if (this.targetUserIds.has(userId)) {
      this.targetUserIds.delete(userId);
      logger.info(
        t("discord:friends.targetUserRemoved", {
          userId,
          count: this.targetUserIds.size,
        })
      );
    }
  }

  public getTargetUserIds(): string[] {
    return Array.from(this.targetUserIds);
  }

  // New method to actively check friends' status
  private async checkFriendsStatus(): Promise<void> {
    if (!this.ready) return;

    try {
      // If we have target user IDs, only check those specific users
      if (this.targetUserIds.size > 0) {
        logger.debug(
          t("common:debug.checkingTargetUsers", {
            count: this.targetUserIds.size,
          })
        );
        for (const userId of this.targetUserIds) {
          await this.checkSpecificUserStatus(userId);
        }
        return;
      }

      // Otherwise, check all friends
      logger.debug(t("common:debug.checkingAllFriends"));

      // This approach works better than using users.cache which might not be populated
      // @ts-ignore - relationships exist in discord.js-selfbot-v13
      const friendsMap = this.client.relationships.friendCache;
      const friendIds = friendsMap ? Array.from(friendsMap.keys()) : [];

      logger.debug(
        t("common:debug.friendCacheCount", { count: friendIds.length })
      );

      // Process each friend by ID
      for (const friendId of friendIds) {
        try {
          await this.checkSpecificUserStatus(friendId);
        } catch (error) {
          logger.error(
            t("common:errors.processingFriendError", { friendId, error })
          );
        }
      }

      logger.debug(t("discord:friends.statusCheckCompleted"));
    } catch (error) {
      logger.error(t("common:errors.checkingFriendsStatusError", { error }));
    }
  }

  // Method to check a specific user's status
  private async checkSpecificUserStatus(userId: string): Promise<void> {
    try {
      // Fetch the user directly - this ensures we get the latest data
      const user = await this.client.users.fetch(userId);

      if (!this.isFriend(userId) && this.targetUserIds.size === 0) {
        logger.debug(
          t("common:debug.notAFriendSkipping", {
            username: user.username,
            userId,
          })
        );
        return;
      }

      logger.debug(
        t("common:debug.checkingUserStatus", {
          username: user.username,
          userId,
        })
      );

      // First try to get presence from the user object
      // @ts-ignore - presence exists in discord.js-selfbot-v13 but TypeScript doesn't know
      let presence = user.presence;

      if (presence) {
        logger.debug(
          t("common:debug.hasPresenceData", { username: user.username })
        );
        this.handlePresenceUpdate(presence);
        return;
      }

      // If no presence, try to find the user in shared guilds
      logger.debug(
        t("common:debug.checkingSharedGuilds", { username: user.username })
      );

      // Find shared guilds with this user
      // @ts-ignore
      const sharedGuilds = this.client.guilds.cache.filter(
        (guild) =>
          guild.members.cache.has(userId) || guild.presences.cache.has(userId)
      );

      logger.debug(
        t("common:debug.foundSharedGuilds", {
          count: sharedGuilds.size,
          username: user.username,
        })
      );

      for (const [guildId, guild] of sharedGuilds) {
        // Try to get from members cache first
        const member = guild.members.cache.get(userId);
        if (member && member.presence) {
          logger.debug(
            t("common:debug.foundPresenceInGuild", {
              username: user.username,
              guildName: guild.name,
              cacheType: "members cache",
            })
          );
          // @ts-ignore
          this.handlePresenceUpdate(member.presence);
          return;
        }

        // Try to get from guild presence cache
        const guildPresence = guild.presences.cache.get(userId);
        if (guildPresence) {
          logger.debug(
            t("common:debug.foundPresenceInGuild", {
              username: user.username,
              guildName: guild.name,
              cacheType: "presences cache",
            })
          );
          this.handlePresenceUpdate(guildPresence);
          return;
        }
      }

      // Force a fetch of the member in some guilds (limit to avoid rate limits)
      const guildsToCheck = Array.from(sharedGuilds.values()).slice(0, 3);
      for (const guild of guildsToCheck) {
        try {
          logger.debug(
            t("common:debug.fetchingMember", {
              username: user.username,
              guildName: guild.name,
            })
          );
          const member = await guild.members.fetch(userId);
          if (member && member.presence) {
            logger.debug(
              t("common:debug.fetchedPresence", {
                username: user.username,
                guildName: guild.name,
              })
            );
            // @ts-ignore
            this.handlePresenceUpdate(member.presence);
            return;
          }
        } catch (err) {
          logger.debug(
            t("common:debug.failedFetchMember", {
              username: user.username,
              guildName: guild.name,
            })
          );
        }
      }

      logger.debug(
        t("common:debug.noPresenceData", {
          username: user.username,
          userId,
        })
      );
    } catch (error) {
      logger.error(t("common:errors.checkingStatusError", { userId, error }));
    }
  }

  private handlePresenceUpdate(presence: Presence): void {
    if (!presence) {
      logger.debug(t("common:debug.nullPresence"));
      return;
    }

    const userId = presence.userId as string;
    if (!presence.user) {
      logger.debug(t("common:debug.noUserProperty", { userId }));
      return;
    }

    if (!this.isFriend(userId) && this.targetUserIds.size === 0) {
      logger.debug(
        t("common:debug.notAFriend", { username: presence.user.username })
      );
      return;
    }

    const activities = presence.activities;

    if (!activities || activities.length === 0) {
      logger.debug(
        t("common:debug.noActivities", { username: presence.user.username })
      );

      // Remove from playing if they stopped
      if (this.friendsPlaying.has(userId)) {
        const friend = this.friendsPlaying.get(userId);
        logger.info(
          t("discord:friends.stoppedPlaying", {
            username: friend?.username,
            gameName: friend?.gameName,
          })
        );
        this.friendsPlaying.delete(userId);
      }

      return;
    }

    logger.debug(
      t("common:debug.userActivities", {
        username: presence.user.username,
        count: activities.length,
        activities: activities.map((a) => `${a.type}: ${a.name}`).join(", "),
      })
    );

    const gameActivity = activities.find(
      (activity) => activity.type === "PLAYING"
    );

    if (gameActivity) {
      const username = presence.user.username;
      const gameName = gameActivity.name;

      // Check if this is a new game session (user wasn't playing this game before)
      const isNewGameSession =
        !this.friendsPlaying.has(userId) ||
        this.friendsPlaying.get(userId)?.gameName !== gameName;

      this.friendsPlaying.set(userId, {
        id: userId,
        username,
        gameName,
      });

      logger.info(t("discord:friends.isPlaying", { username, gameName }));

      // Emit event when a friend starts playing a game for immediate processing
      if (isNewGameSession) {
        this.emit("friendStartedPlaying", userId, username, gameName);
      }
    } else {
      // Remove from playing if they stopped
      if (this.friendsPlaying.has(userId)) {
        const friend = this.friendsPlaying.get(userId);
        logger.info(
          t("discord:friends.stoppedPlaying", {
            username: friend?.username,
            gameName: friend?.gameName,
          })
        );
        this.friendsPlaying.delete(userId);
      }
    }
  }

  public isReady(): boolean {
    return this.ready;
  }

  public getFriendsPlaying(): FriendWithGame[] {
    return Array.from(this.friendsPlaying.values());
  }

  private isFriend(userId: string): boolean {
    // If this user is in our target list, treat it as a friend even if it's not
    if (this.targetUserIds.has(userId)) {
      return true;
    }

    // Check if user is a friend
    // @ts-ignore - relationships exist in discord.js-selfbot-v13
    const relationships = this.client.relationships;
    if (relationships && relationships.friendCache) {
      return relationships.friendCache.has(userId);
    }

    // Fallback to the old method
    const user = this.client.users.cache.get(userId);
    if (!user) return false;
    return user.relationship === 1; // 1 = Friend in discord.js-selfbot
  }

  public async sendDirectMessage(
    userId: string,
    content: string
  ): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      const dmChannel = await user.createDM();
      await dmChannel.send(content);
      return true;
    } catch (error) {
      logger.error(t("discord:directMessage.failed", { userId }), error);
      return false;
    }
  }

  // Method to clean up resources when stopping
  public cleanup(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = undefined;
    }
  }
}
