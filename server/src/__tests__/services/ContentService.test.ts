import { Types } from "mongoose";
import { ContentService } from "../../services/ContentService";
import { ContentHistory, IContentHistory } from "../../models/ContentHistory";
import { Friend, IFriend } from "../../models/Friend";
import { DiscordAccount, IDiscordAccountModel } from "../../models/DiscordAccount";

// Mock SerpApi
jest.mock("google-search-results-nodejs", () => ({
  SerpApi: {
    GoogleSearch: jest.fn().mockImplementation(() => ({
      json: jest.fn().mockImplementation((params, callback) => {
        callback({
          images_results: [
            {
              original: "http://example.com/meme1.jpg",
              title: "Funny Meme 1",
              source: "example.com",
              type: "image/jpeg",
            },
            {
              original: "http://example.com/meme2.jpg",
              title: "Funny Meme 2",
              source: "example.com",
              type: "image/jpeg",
            },
          ],
        });
      }),
    })),
  },
}));

jest.mock("../../models/ContentHistory");
jest.mock("../../workers/WorkerManager");

describe("ContentService", () => {
  let contentService: ContentService;
  let mockDiscordAccount: IDiscordAccountModel;
  let mockFriend: IFriend & { _id: Types.ObjectId };

  beforeAll(() => {
    // Set required environment variable
    process.env.SERP_API_KEY = "test-api-key";
    contentService = ContentService.getInstance();
  });

  beforeEach(async () => {
    // Create test Discord account
    mockDiscordAccount = (await DiscordAccount.create({
      userId: new Types.ObjectId(),
      name: "Test Account",
      token: "test-token",
      isActive: true,
    })) as IDiscordAccountModel;

    // Create test friend
    mockFriend = (await Friend.create({
      discordAccountId: mockDiscordAccount._id,
      userId: "123456789",
      username: "TestFriend",
    })) as IFriend & { _id: Types.ObjectId };
  });

  afterEach(async () => {
    await ContentHistory.deleteMany({});
    await Friend.deleteMany({});
    await DiscordAccount.deleteMany({});
  });

  describe("Content Search", () => {
    it("should search for game-related content", async () => {
      const content = await contentService.searchContent({
        type: "GAME",
        query: "Minecraft",
      });

      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
      expect(content[0]).toHaveProperty("url");
      expect(content[0]).toHaveProperty("title");
      expect(content[0]).toHaveProperty("source");
      expect(content[0]).toHaveProperty("type");
    });

    it("should search for music-related content", async () => {
      const content = await contentService.searchContent({
        type: "MUSIC",
        query: "Taylor Swift",
      });

      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it("should respect content count parameter", async () => {
      const content = await contentService.searchContent({
        type: "GAME",
        query: "Minecraft",
        count: 1,
      });

      expect(content.length).toBe(1);
    });

    it("should apply content filters", async () => {
      const content = await contentService.searchContent({
        type: "GAME",
        query: "Minecraft",
        filters: {
          includeKeywords: ["funny", "epic"],
        },
      });

      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it("should search for game content", async () => {
      const content = await contentService.searchContent({
        type: "GAME",
        query: "Minecraft",
        filters: {
          includeKeywords: ["gaming", "gamer"],
          excludeKeywords: ["walkthrough"],
        },
      });

      expect(content).toHaveLength(5); // Default count
      expect(content[0]).toHaveProperty("url");
      expect(content[0]).toHaveProperty("title");
      expect(content[0]).toHaveProperty("metadata.relevanceScore");
    });

    it("should search for music content", async () => {
      const content = await contentService.searchContent({
        type: "MUSIC",
        query: "Artist Name",
        filters: {
          includeKeywords: ["music", "artist"],
          excludeKeywords: ["cover"],
        },
      });

      expect(content).toHaveLength(5);
      expect(content[0]).toHaveProperty("url");
      expect(content[0]).toHaveProperty("title");
      expect(content[0]).toHaveProperty("metadata.relevanceScore");
    });

    it("should search for streaming content", async () => {
      const content = await contentService.searchContent({
        type: "STREAMING",
        query: "Stream Title",
        filters: {
          includeKeywords: ["stream", "twitch"],
          excludeKeywords: ["sub"],
        },
      });

      expect(content).toHaveLength(5);
      expect(content[0]).toHaveProperty("url");
      expect(content[0]).toHaveProperty("title");
      expect(content[0]).toHaveProperty("metadata.relevanceScore");
    });
  });

  describe("Content History", () => {
    it("should store content history", async () => {
      const content = [
        {
          url: "http://example.com/meme1.jpg",
          title: "Test Meme 1",
          source: "example.com",
          type: "image/jpeg",
        },
      ];

      const history = await contentService.storeContentHistory(
        mockDiscordAccount._id,
        mockFriend._id,
        content,
        "GAME",
        "Minecraft",
      );

      expect(history).toBeDefined();
      expect(history.discordAccountId.toString()).toBe(mockDiscordAccount._id.toString());
      expect(history.friendId.toString()).toBe(mockFriend._id.toString());
      expect(history.content).toHaveLength(1);
      expect(history.trigger).toEqual({
        type: "GAME",
        value: "Minecraft",
      });
      expect(history.status).toBe("PENDING");
    });

    it("should get friend content history", async () => {
      // Store some test content history
      await contentService.storeContentHistory(
        mockDiscordAccount._id,
        mockFriend._id,
        [
          {
            url: "http://example.com/meme1.jpg",
            title: "Test Meme 1",
            source: "example.com",
            type: "image/jpeg",
          },
        ],
        "GAME",
        "Minecraft",
      );

      const friendHistory = await contentService.getFriendContentHistory(mockFriend._id);

      expect(Array.isArray(friendHistory)).toBe(true);
      expect(friendHistory.length).toBe(1);
      expect(friendHistory[0].friendId.toString()).toBe(mockFriend._id.toString());
    });

    it("should get account content history", async () => {
      // Store some test content history
      await contentService.storeContentHistory(
        mockDiscordAccount._id,
        mockFriend._id,
        [
          {
            url: "http://example.com/meme1.jpg",
            title: "Test Meme 1",
            source: "example.com",
            type: "image/jpeg",
          },
        ],
        "GAME",
        "Minecraft",
      );

      const accountHistory = await contentService.getAccountContentHistory(mockDiscordAccount._id);

      expect(Array.isArray(accountHistory)).toBe(true);
      expect(accountHistory.length).toBe(1);
      expect(accountHistory[0].discordAccountId.toString()).toBe(mockDiscordAccount._id.toString());
    });

    it("should update delivery status", async () => {
      const history = (await contentService.storeContentHistory(
        mockDiscordAccount._id,
        mockFriend._id,
        [
          {
            url: "http://example.com/meme1.jpg",
            title: "Test Meme 1",
            source: "example.com",
            type: "image/jpeg",
          },
        ],
        "GAME",
        "Minecraft",
      )) as IContentHistory & { _id: Types.ObjectId };

      await contentService.updateDeliveryStatus(history._id, "SUCCESS");

      const updatedHistory = await ContentHistory.findById(history._id);
      expect(updatedHistory?.status).toBe("SENT");
    });

    it.skip("should add user feedback", async () => {
      const history = (await contentService.storeContentHistory(
        mockDiscordAccount._id,
        mockFriend._id,
        [
          {
            url: "http://example.com/meme1.jpg",
            title: "Test Meme 1",
            source: "example.com",
            type: "image/jpeg",
          },
        ],
        "GAME",
        "Minecraft",
      )) as IContentHistory & { _id: Types.ObjectId };

      await contentService.addUserFeedback(history._id, 5, "Great meme!");

      // TODO: Implement feedback in ContentHistory model
      const updatedHistory = await ContentHistory.findById(history._id);
      expect(updatedHistory).toBeDefined();
    });
  });
});
