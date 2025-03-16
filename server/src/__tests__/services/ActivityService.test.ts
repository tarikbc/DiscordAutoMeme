import { ActivityService } from "../../services/ActivityService";
import { Friend } from "../../models/Friend";
import { ActivityHistory } from "../../models/ActivityHistory";
import { WorkerPresenceEvent } from "../../types/worker";

jest.mock("../../models/Friend");
jest.mock("../../models/ActivityHistory");

describe("ActivityService", () => {
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = ActivityService.getInstance();
  });

  describe("processActivity", () => {
    const mockEvent: WorkerPresenceEvent = {
      accountId: "account123",
      friendId: "friend123",
      oldActivity: null,
      newActivity: {
        type: "GAME",
        details: {
          gameName: "Minecraft",
          startedAt: new Date(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    it("should process new game activity", async () => {
      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["GAME"],
          timeRestrictions: {
            startHour: 0,
            endHour: 24,
          },
        },
      });

      const result = await service.processActivity(mockEvent);
      expect(result.shouldSendContent).toBe(true);
      expect(result.contentType).toBe("GAME");
      expect(result.trigger).toBe("Minecraft");
    });

    it("should process new music activity", async () => {
      const musicEvent: WorkerPresenceEvent = {
        ...mockEvent,
        newActivity: {
          type: "MUSIC",
          details: {
            musicDetails: {
              artist: "Artist Name",
              song: "Song Name",
              album: "Album Name",
            },
            startedAt: new Date(),
          },
        },
      };

      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["MUSIC"],
          timeRestrictions: {
            startHour: 0,
            endHour: 24,
          },
        },
      });

      const result = await service.processActivity(musicEvent);
      expect(result.shouldSendContent).toBe(true);
      expect(result.contentType).toBe("MUSIC");
      expect(result.trigger).toBe("Artist Name");
    });

    it("should process new streaming activity", async () => {
      const streamEvent: WorkerPresenceEvent = {
        ...mockEvent,
        newActivity: {
          type: "STREAMING",
          details: {
            streamingDetails: {
              platform: "Twitch",
              title: "Stream Title",
              url: "https://twitch.tv/test",
            },
            startedAt: new Date(),
          },
        },
      };

      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["STREAMING"],
          timeRestrictions: {
            startHour: 0,
            endHour: 24,
          },
        },
      });

      const result = await service.processActivity(streamEvent);
      expect(result.shouldSendContent).toBe(true);
      expect(result.contentType).toBe("STREAMING");
      expect(result.trigger).toBe("Stream Title");
    });

    it("should respect cooldown", async () => {
      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["GAME"],
          timeRestrictions: {
            startHour: 0,
            endHour: 24,
          },
        },
      });

      // First call should succeed
      const result1 = await service.processActivity(mockEvent);
      expect(result1.shouldSendContent).toBe(true);

      // Second call should be on cooldown
      const result2 = await service.processActivity(mockEvent);
      expect(result2.shouldSendContent).toBe(false);
      expect(result2.cooldownMs).toBeGreaterThan(0);
    });

    it("should respect time restrictions", async () => {
      const currentHour = new Date().getHours();
      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["GAME"],
          timeRestrictions: {
            startHour: (currentHour + 1) % 24,
            endHour: (currentHour + 2) % 24,
          },
        },
      });

      const result = await service.processActivity(mockEvent);
      expect(result.shouldSendContent).toBe(false);
    });

    it("should respect friend preferences", async () => {
      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["MUSIC"], // Only music enabled, not games
          timeRestrictions: {
            startHour: 0,
            endHour: 24,
          },
        },
      });

      const result = await service.processActivity(mockEvent);
      expect(result.shouldSendContent).toBe(false);
    });

    it("should handle missing friend", async () => {
      (Friend.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.processActivity(mockEvent);
      expect(result.shouldSendContent).toBe(false);
    });

    it("should log activity", async () => {
      (Friend.findOne as jest.Mock).mockResolvedValue({
        contentPreferences: {
          enabledTypes: ["GAME"],
          timeRestrictions: {
            startHour: 0,
            endHour: 24,
          },
        },
      });

      await service.processActivity(mockEvent);

      expect(ActivityHistory.prototype.save).toHaveBeenCalled();
    });
  });
});
