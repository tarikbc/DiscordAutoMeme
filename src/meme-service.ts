import { DiscordClient } from "./discord-client";
import { MemeSearcher } from "./meme-searcher";
import { logger } from "./utils/logger";
import { t } from "./i18n";
import { Meme } from "./types";

export class MemeService {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private friendCooldowns: Map<string, number> = new Map();
  private readonly cooldownMinutes: number = 60;
  private discordClient: DiscordClient;
  private memeSearcher: MemeSearcher;
  private memesPerSend: number;
  private sendEnabled: boolean;
  private targetUserIds: string[] = [];
  private checkIntervalMinutes: number;

  constructor(
    discordClient: DiscordClient,
    memeSearcher: MemeSearcher,
    memesPerSend: number = 1,
    checkIntervalMinutes: number = 5,
    sendEnabled: boolean = true,
    targetUserIds?: string[]
  ) {
    this.discordClient = discordClient;
    this.memeSearcher = memeSearcher;
    this.memesPerSend = memesPerSend;
    this.checkIntervalMinutes = checkIntervalMinutes;
    this.sendEnabled = sendEnabled;

    // Handle target user IDs
    if (targetUserIds) {
      this.targetUserIds = targetUserIds;
      // Update the target users in the client
      this.discordClient.setTargetUserIds(this.targetUserIds);
    }

    // Set up event listener for immediate meme sending when a friend starts playing
    this.discordClient.on(
      "friendStartedPlaying",
      (userId: string, username: string, gameName: string) => {
        if (this.isRunning) {
          logger.info(
            t("discord:friends.immediateResponse", { username, gameName })
          );
          this.processFriend(userId, username, gameName);
        }
      }
    );

    // Set up event listener for immediate meme sending when a friend starts listening to music
    this.discordClient.on(
      "friendStartedListening",
      (
        userId: string,
        username: string,
        artistName: string,
        songName?: string,
        albumName?: string,
        playerName?: string
      ) => {
        if (this.isRunning) {
          logger.info(
            t("discord:friends.immediateResponseMusic", {
              username,
              artistName,
              songName,
              playerName: playerName || t("common:unknownPlayer"),
            })
          );
          this.processFriendMusic(
            userId,
            username,
            artistName,
            songName,
            playerName
          );
        }
      }
    );
  }

  public start(): void {
    if (this.isRunning) {
      logger.warn(t("common:alreadyRunning"));
      return;
    }

    logger.info(t("common:started"));
    this.isRunning = true;

    // Initial check right after starting
    this.checkFriendsPlaying();

    // Schedule regular checks
    this.interval = setInterval(
      () => this.checkFriendsPlaying(),
      this.checkIntervalMinutes * 60 * 1000
    );
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn(t("common:notRunning"));
      return;
    }

    logger.info(t("common:stopping"));
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clean up Discord client resources
    this.discordClient.cleanup();

    logger.info(t("common:stopped"));
  }

  // Update target users - replaces all existing targets
  public updateTargetUsers(userIds: string[] | undefined): void {
    this.targetUserIds = userIds || [];
    this.discordClient.setTargetUserIds(this.targetUserIds);
  }

  // Add a specific target user
  public addTargetUser(userId: string): void {
    if (!this.targetUserIds.includes(userId)) {
      this.targetUserIds.push(userId);
      this.discordClient.addTargetUserId(userId);
    }
  }

  // Remove a specific target user
  public removeTargetUser(userId: string): void {
    this.targetUserIds = this.targetUserIds.filter((id) => id !== userId);
    this.discordClient.removeTargetUserId(userId);
  }

  private async checkFriendsPlaying(): Promise<void> {
    if (!this.discordClient.isReady()) {
      logger.warn(t("discord:friends.clientNotReady"));
      return;
    }

    try {
      // Get friends who are playing games from the Discord client
      const friendsPlaying = this.discordClient.getFriendsPlaying();

      // Get friends who are listening to music
      const friendsListening = this.discordClient.getFriendsListening();

      logger.info(
        t("discord:friends.foundCount", { count: friendsPlaying.length })
      );

      logger.info(
        t("discord:friends.foundListeningCount", {
          count: friendsListening.length,
        })
      );

      // If we have a target user but they're not playing or listening, log it
      if (
        this.targetUserIds.length > 0 &&
        friendsPlaying.length === 0 &&
        friendsListening.length === 0
      ) {
        logger.info(
          t("discord:friends.notPlayingOrListening", {
            userId: this.targetUserIds.join(", "),
          })
        );
        return;
      }

      // Process each friend who's playing a game
      for (const friend of friendsPlaying) {
        await this.processFriend(friend.id, friend.username, friend.gameName);
      }

      // Process each friend who's listening to music
      for (const friend of friendsListening) {
        await this.processFriendMusic(
          friend.id,
          friend.username,
          friend.artistName,
          friend.songName,
          friend.playerName
        );
      }

      logger.info(t("discord:friends.statusCheckCompleted"));
    } catch (error) {
      logger.error(t("common:errors.checkingFriendsError", { error }));
    }
  }

  private async processFriend(
    userId: string,
    username: string,
    gameName: string
  ): Promise<void> {
    logger.info(t("discord:friends.isPlaying", { username, gameName }));

    // Check cooldown
    const lastSent = this.friendCooldowns.get(userId) || 0;
    const now = Date.now();
    const minutesSinceLastSent = (now - lastSent) / (1000 * 60);

    if (minutesSinceLastSent < this.cooldownMinutes) {
      logger.info(t("discord:friends.skippingCooldown", { username }));
      return;
    }

    // Update cooldown
    this.friendCooldowns.set(userId, now);

    // Send memes
    await this.sendMemesToFriend(userId, username, gameName);
  }

  private async processFriendMusic(
    userId: string,
    username: string,
    artistName: string,
    songName?: string,
    playerName?: string
  ): Promise<void> {
    logger.info(
      t("discord:friends.isListening", {
        username,
        artistName,
        songName,
        playerName: playerName || t("common:unknownPlayer"),
      })
    );

    // Check cooldown
    const lastSent = this.friendCooldowns.get(userId) || 0;
    const now = Date.now();
    const minutesSinceLastSent = (now - lastSent) / (1000 * 60);

    if (minutesSinceLastSent < this.cooldownMinutes) {
      logger.info(t("discord:friends.skippingCooldown", { username }));
      return;
    }

    // Update cooldown
    this.friendCooldowns.set(userId, now);

    // Send memes
    await this.sendMemesToFriendForArtist(
      userId,
      username,
      artistName,
      songName,
      playerName
    );
  }

  private async sendMemesToFriend(
    userId: string,
    username: string,
    gameName: string
  ): Promise<void> {
    logger.info(
      t("memes:sending", {
        count: this.memesPerSend,
        username,
        gameName,
      })
    );

    try {
      // Search for memes about the game
      const memes = await this.memeSearcher.searchMemes(
        gameName,
        this.memesPerSend
      );

      if (!memes.length) {
        logger.warn(t("memes:noMemesFound", { gameName }));
        return;
      }

      if (this.sendEnabled) {
        // Build message
        const greeting = t("discord:directMessage.greeting", {
          username,
          gameName,
        });
        const closing = t("discord:directMessage.closing");

        // Send the greeting
        await this.discordClient.sendDirectMessage(userId, greeting);

        // Send each meme individually
        for (let i = 0; i < memes.length; i++) {
          const meme = memes[i];
          try {
            // Try to send the meme as an embedded image first
            await this.discordClient.sendDirectMessage(userId, {
              content: "",
              files: [meme.url],
            });
          } catch (error: any) {
            // If sending as file fails, send as a regular URL
            logger.warn(
              t("memes:fallbackToText", {
                url: meme.url,
                error: error.message || "Unknown error",
              })
            );
            await this.discordClient.sendDirectMessage(userId, `${meme.url}`);
          }
        }

        // Send the closing message
        await this.discordClient.sendDirectMessage(userId, closing);
      } else {
        // Test mode - log what would have been sent
        logger.info(
          t("common:testMode.wouldHaveSent", {
            count: memes.length,
            username,
            gameName,
          })
        );
        const urls = memes
          .map((m: Meme) => m.url)
          .join(", ")
          .substring(0, 50);
        logger.info(t("common:testMode.memeUrls", { urls }));
      }
    } catch (error) {
      logger.error(
        t("discord:directMessage.failed", { userId }) + `: ${error}`
      );
    }
  }

  private async sendMemesToFriendForArtist(
    userId: string,
    username: string,
    artistName: string,
    songName?: string,
    playerName?: string
  ): Promise<void> {
    logger.info(
      t("memes:sending.sendingForArtist", {
        count: this.memesPerSend,
        username,
        artistName,
      })
    );

    try {
      // Search for memes about the artist
      const memes = await this.memeSearcher.searchMemes(
        artistName,
        this.memesPerSend
      );

      if (!memes.length) {
        logger.warn(t("memes:noMemesFound", { artistName }));
        return;
      }

      if (this.sendEnabled) {
        // Build message
        const greeting = t("discord:directMessage.greetingMusic", {
          username,
          artistName,
          songName: songName || t("common:unknownSong"),
          playerName: playerName || t("common:unknownPlayer"),
        });
        const closing = t("discord:directMessage.closingMusic");

        // Send the greeting
        await this.discordClient.sendDirectMessage(userId, greeting);

        // Send each meme individually
        for (let i = 0; i < memes.length; i++) {
          const meme = memes[i];
          try {
            // Try to send the meme as an embedded image first
            await this.discordClient.sendDirectMessage(userId, {
              content: "",
              files: [meme.url],
            });
          } catch (error: any) {
            // If sending as file fails, send as a regular URL
            logger.warn(
              t("memes:fallbackToText", {
                url: meme.url,
                error: error.message || "Unknown error",
              })
            );
            await this.discordClient.sendDirectMessage(userId, `${meme.url}`);
          }
        }

        // Send the closing message
        await this.discordClient.sendDirectMessage(userId, closing);
      } else {
        // Test mode - log what would have been sent
        logger.info(
          t("common:testMode.wouldHaveSentForArtist", {
            count: memes.length,
            username,
            artistName,
            playerName: playerName || t("common:unknownPlayer"),
          })
        );
        const urls = memes
          .map((m: Meme) => m.url)
          .join(", ")
          .substring(0, 50);
        logger.info(t("common:testMode.memeUrls", { urls }));
      }
    } catch (error) {
      logger.error(
        t("discord:directMessage.failed", { userId }) + `: ${error}`
      );
    }
  }
}
