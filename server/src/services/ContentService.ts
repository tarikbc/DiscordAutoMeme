import { Types } from "mongoose";
import { ContentHistory, IContentHistory } from "../models/ContentHistory";
import { DiscordAccount } from "../models/DiscordAccount";
import { Friend } from "../models/Friend";
import logger from "../utils/logger";
import { SerpApi } from "google-search-results-nodejs";
import { WorkerManager } from "../workers/WorkerManager";

interface ContentSearchParams {
  type: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";
  query: string;
  count?: number;
  filters?: {
    excludeKeywords?: string[];
    includeKeywords?: string[];
    minRating?: number;
    maxRating?: number;
  };
}

interface ContentItem {
  url: string;
  title: string;
  source: string;
  type: string;
  metadata?: Record<string, any>;
}

interface ContentProvider {
  type: string;
  search(query: string): Promise<ContentResult | null>;
}

interface ContentResult {
  url: string;
  title: string;
  source: string;
  type: string;
}

export class ContentService {
  private static instance: ContentService;
  private searchClient: any;
  private readonly DEFAULT_COUNT = 5;
  private workerManager: WorkerManager;
  private providers: Map<string, ContentProvider> = new Map();

  private constructor() {
    // Initialize SerpAPI client - will be replaced with provider registry in Phase 4
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      throw new Error("SERP_API_KEY environment variable is not set");
    }
    this.searchClient = new SerpApi.GoogleSearch(apiKey);
    this.workerManager = WorkerManager.getInstance();
    this.registerDefaultProviders();
  }

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  private registerDefaultProviders() {
    // Register providers for each activity type with specific search strategies
    this.registerContentProvider({
      type: "GAME",
      search: async (gameName: string) => {
        const content = await this.searchContent({
          type: "GAME",
          query: gameName,
          filters: {
            includeKeywords: ["gaming", "gamer", "gameplay", "reaction"],
            excludeKeywords: ["walkthrough", "tutorial", "hack"],
          },
        });
        return content[0] || null;
      },
    });

    this.registerContentProvider({
      type: "MUSIC",
      search: async (artist: string) => {
        const content = await this.searchContent({
          type: "MUSIC",
          query: artist,
          filters: {
            includeKeywords: ["music", "artist", "band", "concert", "lyrics"],
            excludeKeywords: ["cover", "karaoke", "tutorial"],
          },
        });
        return content[0] || null;
      },
    });

    this.registerContentProvider({
      type: "STREAMING",
      search: async (streamTitle: string) => {
        const content = await this.searchContent({
          type: "STREAMING",
          query: streamTitle,
          filters: {
            includeKeywords: ["stream", "live", "twitch", "streamer", "highlight"],
            excludeKeywords: ["sub", "subscribe", "donation"],
          },
        });
        return content[0] || null;
      },
    });

    this.registerContentProvider({
      type: "WATCHING",
      search: async (showTitle: string) => {
        const content = await this.searchContent({
          type: "WATCHING",
          query: showTitle,
          filters: {
            includeKeywords: ["show", "series", "episode", "scene", "reaction"],
            excludeKeywords: ["spoiler", "leak", "full episode"],
          },
        });
        return content[0] || null;
      },
    });

    this.registerContentProvider({
      type: "CUSTOM",
      search: async (status: string) => {
        const content = await this.searchContent({
          type: "CUSTOM",
          query: status,
          filters: {
            includeKeywords: ["funny", "relatable", "mood"],
            excludeKeywords: ["nsfw", "offensive"],
          },
        });
        return content[0] || null;
      },
    });

    this.registerContentProvider({
      type: "COMPETING",
      search: async (competition: string) => {
        const content = await this.searchContent({
          type: "COMPETING",
          query: competition,
          filters: {
            includeKeywords: ["competition", "tournament", "championship", "victory"],
            excludeKeywords: ["betting", "odds", "gambling"],
          },
        });
        return content[0] || null;
      },
    });
  }

  public registerContentProvider(provider: ContentProvider): void {
    this.providers.set(provider.type, provider);
  }

  /**
   * Search for content based on activity
   */
  searchContent(params: ContentSearchParams): Promise<ContentItem[]> | ContentItem[] {
    try {
      const count = params.count || this.DEFAULT_COUNT;
      let searchQuery = "";

      // Build search query based on activity type
      switch (params.type) {
        case "GAME":
          searchQuery = `${params.query} gaming meme reaction funny`;
          break;
        case "MUSIC":
          searchQuery = `${params.query} music artist band meme funny`;
          break;
        case "STREAMING":
          searchQuery = `${params.query} stream twitch meme funny`;
          break;
        case "WATCHING":
          searchQuery = `${params.query} show series meme reaction funny`;
          break;
        case "CUSTOM":
          searchQuery = `${params.query} mood meme relatable funny`;
          break;
        case "COMPETING":
          searchQuery = `${params.query} competition tournament meme funny`;
          break;
      }

      // Apply filters if provided
      if (params.filters?.includeKeywords?.length) {
        searchQuery += ` ${params.filters.includeKeywords.join(" ")}`;
      }

      const serpParams = {
        q: searchQuery,
        tbm: "isch", // Image search
        ijn: "0", // Page number
        safe: "active", // Safe search
        num: count * 2, // Get more results than needed to have options
        // Add activity-specific search parameters
        ...(params.type === "GAME" && { cr: "gaming" }), // Gaming category
        ...(params.type === "MUSIC" && { cr: "music" }), // Music category
        ...(params.type === "WATCHING" && { cr: "entertainment" }), // Entertainment category
      };

      // Search for content using SerpAPI
      return new Promise<ContentItem[]>((resolve, reject) => {
        this.searchClient.json(serpParams, (data: any) => {
          try {
            if (!data.images_results || !data.images_results.length) {
              logger.warn(`No content found for query: ${searchQuery}`);
              return resolve([]);
            }

            // Filter and transform results with activity-specific rules
            const content: ContentItem[] = data.images_results
              .slice(0, count * 2)
              .map((result: any) => ({
                url: result.original,
                title: result.title || `Content for ${params.query}`,
                source: result.source,
                type: "image/jpeg",
                metadata: {
                  width: result.width,
                  height: result.height,
                  thumbnail: result.thumbnail,
                  relevanceScore: this.calculateRelevanceScore(result, params.type),
                },
              }))
              .filter((item: ContentItem) => {
                // Apply general exclusion filters
                if (params.filters?.excludeKeywords?.length) {
                  const lowerTitle = item.title.toLowerCase();
                  return !params.filters.excludeKeywords.some(keyword =>
                    lowerTitle.includes(keyword.toLowerCase()),
                  );
                }
                return true;
              })
              // Sort by relevance score
              .sort(
                (a: ContentItem, b: ContentItem) =>
                  (b.metadata?.relevanceScore || 0) - (a.metadata?.relevanceScore || 0),
              )
              .slice(0, count);

            logger.info(
              `Found ${content.length} content items for ${params.type} activity: ${params.query}`,
            );
            resolve(content);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      logger.error("Content search failed:", error);
      return [];
    }
  }

  private calculateRelevanceScore(result: any, activityType: ContentSearchParams["type"]): number {
    let score = 0;

    // Base score from result properties
    if (result.title) score += 1;
    if (result.source) score += 1;
    if (result.width > 400 && result.height > 400) score += 1; // Prefer larger images
    if (result.width === result.height) score += 1; // Square images often work better

    // Activity-specific scoring
    const lowerTitle = result.title?.toLowerCase() || "";
    switch (activityType) {
      case "GAME":
        if (lowerTitle.includes("gaming")) score += 2;
        if (lowerTitle.includes("gameplay")) score += 1;
        if (lowerTitle.includes("reaction")) score += 1;
        break;
      case "MUSIC":
        if (lowerTitle.includes("music")) score += 2;
        if (lowerTitle.includes("artist")) score += 1;
        if (lowerTitle.includes("concert")) score += 1;
        break;
      case "STREAMING":
        if (lowerTitle.includes("stream")) score += 2;
        if (lowerTitle.includes("twitch")) score += 1;
        if (lowerTitle.includes("live")) score += 1;
        break;
      case "WATCHING":
        if (lowerTitle.includes("show")) score += 2;
        if (lowerTitle.includes("series")) score += 1;
        if (lowerTitle.includes("reaction")) score += 1;
        break;
      case "CUSTOM":
        if (lowerTitle.includes("mood")) score += 2;
        if (lowerTitle.includes("relatable")) score += 1;
        if (lowerTitle.includes("funny")) score += 1;
        break;
      case "COMPETING":
        if (lowerTitle.includes("competition")) score += 2;
        if (lowerTitle.includes("tournament")) score += 1;
        if (lowerTitle.includes("victory")) score += 1;
        break;
    }

    return score;
  }

  /**
   * Store content history
   */
  async storeContentHistory(
    discordAccountId: Types.ObjectId,
    friendId: Types.ObjectId,
    content: ContentItem[],
    triggerType: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING",
    triggerName: string,
  ): Promise<IContentHistory> {
    try {
      const history = await ContentHistory.create({
        discordAccountId,
        friendId,
        contentType: content[0].type,
        content: content.map(item => ({
          url: item.url,
          title: item.title,
          source: item.source,
          type: item.type,
        })),
        triggerType,
        triggerName,
        sentAt: new Date(),
        deliveryStatus: "SUCCESS",
      });

      logger.info(
        `Stored content history for friend ${friendId} with trigger ${triggerType}:${triggerName}`,
      );
      return history;
    } catch (error) {
      logger.error("Failed to store content history:", error);
      throw error;
    }
  }

  /**
   * Get content history for a friend
   */
  getFriendContentHistory(friendId: Types.ObjectId, limit = 10): Promise<IContentHistory[]> {
    return ContentHistory.find({ friendId }).sort({ sentAt: -1 }).limit(limit).exec();
  }

  /**
   * Get content history for a Discord account
   */
  getAccountContentHistory(
    discordAccountId: Types.ObjectId,
    limit = 10,
  ): Promise<IContentHistory[]> {
    return ContentHistory.find({ discordAccountId }).sort({ sentAt: -1 }).limit(limit).exec();
  }

  /**
   * Update content delivery status
   */
  async updateDeliveryStatus(
    historyId: Types.ObjectId,
    status: "SUCCESS" | "FAILED",
    error?: string,
  ): Promise<void> {
    await ContentHistory.findByIdAndUpdate(historyId, {
      $set: {
        deliveryStatus: status,
        ...(error && { error }),
      },
    }).exec();
  }

  /**
   * Add user feedback to content
   */
  async addUserFeedback(
    historyId: Types.ObjectId,
    rating: number,
    comment?: string,
  ): Promise<void> {
    await ContentHistory.findByIdAndUpdate(historyId, {
      $set: {
        userFeedback: {
          rating,
          comment,
        },
      },
    }).exec();
  }

  public async handleActivityTrigger(
    accountId: string,
    friendId: string,
    activityId: string,
    contentType: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING",
    trigger: string,
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!accountId || !friendId || !contentType || !trigger) {
        logger.warn("Invalid activity trigger parameters");
        return false;
      }

      // Get account and friend
      const [account, friend] = await Promise.all([
        DiscordAccount.findById(accountId),
        Friend.findById(friendId),
      ]);

      if (!account || !friend) {
        logger.warn("Account or friend not found");
        return false;
      }

      // Find relevant content
      const content = await this.findRelevantContent(contentType, trigger);
      if (!content) {
        logger.warn(`No content found for ${contentType}: ${trigger}`);
        return false;
      }

      // Log content selection
      const history = await this.logContentSelection({
        discordAccountId: new Types.ObjectId(accountId),
        friendId: new Types.ObjectId(friendId),
        activityId: new Types.ObjectId(activityId),
        contentType: content.type,
        content,
        trigger: {
          type: contentType,
          value: trigger,
        },
        status: "PENDING",
      });

      // Send content delivery command to worker
      await this.workerManager.sendToWorker(accountId, {
        type: "CONTENT_DELIVERY",
        data: {
          friendId,
          content: {
            url: content.url,
            title: content.title,
          },
          historyId: history._id.toString(),
          context: {
            type: contentType,
            trigger,
          },
        },
      });

      return true;
    } catch (error) {
      logger.error("Error handling activity trigger:", error);
      return false;
    }
  }

  private findRelevantContent(
    type: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING",
    trigger: string,
  ): Promise<ContentResult | null> | null {
    const provider = this.providers.get(type);
    if (!provider) {
      logger.warn(`No content provider found for type: ${type}`);
      return null;
    }

    return provider.search(trigger);
  }

  private async logContentSelection(data: {
    discordAccountId: Types.ObjectId;
    friendId: Types.ObjectId;
    activityId: Types.ObjectId;
    contentType: string;
    content: ContentResult;
    trigger: {
      type: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";
      value: string;
    };
    status: "PENDING" | "SENT" | "FAILED";
  }): Promise<IContentHistory> {
    const history = new ContentHistory(data);
    await history.save();
    return history;
  }
}
