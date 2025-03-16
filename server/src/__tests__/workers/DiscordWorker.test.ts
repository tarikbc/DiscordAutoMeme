import { DiscordWorker } from "../../workers/DiscordWorker";
import { Presence } from "discord.js-selfbot-v13";
import { ActivityState } from "../../types/worker";
import { IDiscordAccountSettings } from "../../models/DiscordAccount";

describe("DiscordWorker Activity Detection", () => {
  let worker: DiscordWorker;
  const settings: IDiscordAccountSettings = {
    autoReconnect: true,
    statusUpdateInterval: 60000,
    contentPreferences: {
      memes: true,
      gifs: true,
      quotes: true,
      news: true,
      jokes: true,
    },
    deliveryPreferences: {
      frequency: 3600000,
      timeWindows: [
        {
          start: "09:00",
          end: "23:00",
        },
      ],
    },
  };

  beforeEach(() => {
    worker = new DiscordWorker("test-account", "test-token", settings);
  });

  describe("extractActivity", () => {
    it("should extract GAME activity", () => {
      const mockPresence = {
        activities: [
          {
            type: 0, // PLAYING
            name: "Minecraft",
            createdTimestamp: Date.now(),
            equals: () => false,
          },
        ],
        status: "online",
        clientStatus: {},
        equals: () => false,
        guild: null,
        member: null,
        userId: "test-user",
      } as unknown as Presence;

      const activity = worker["extractActivity"](mockPresence);
      expect(activity).toEqual({
        type: "GAME",
        details: {
          gameName: "Minecraft",
          startedAt: expect.any(Date),
        },
      });
    });

    it("should extract MUSIC activity", () => {
      const presence = {
        activities: [
          {
            type: "LISTENING",
            name: "Spotify",
            state: "Artist Name",
            details: "Song Name",
            assets: { largeText: "Album Name" },
            createdAt: new Date(),
          },
        ],
      } as Presence;

      const activity = worker["extractActivity"](presence);
      expect(activity).toEqual({
        type: "MUSIC",
        details: {
          musicDetails: {
            artist: "Artist Name",
            song: "Song Name",
            album: "Album Name",
          },
          startedAt: expect.any(Date),
        },
      });
    });

    it("should extract STREAMING activity", () => {
      const presence = {
        activities: [
          {
            type: "STREAMING",
            name: "Twitch",
            details: "Stream Title",
            url: "https://twitch.tv/test",
            createdAt: new Date(),
          },
        ],
      } as Presence;

      const activity = worker["extractActivity"](presence);
      expect(activity).toEqual({
        type: "STREAMING",
        details: {
          streamingDetails: {
            platform: "Twitch",
            title: "Stream Title",
            url: "https://twitch.tv/test",
          },
          startedAt: expect.any(Date),
        },
      });
    });

    it("should extract WATCHING activity", () => {
      const presence = {
        activities: [
          {
            type: "WATCHING",
            name: "Netflix",
            details: "Show Title",
            createdAt: new Date(),
          },
        ],
      } as Presence;

      const activity = worker["extractActivity"](presence);
      expect(activity).toEqual({
        type: "WATCHING",
        details: {
          watchingDetails: {
            title: "Netflix",
            platform: "Show Title",
          },
          startedAt: expect.any(Date),
        },
      });
    });

    it("should extract CUSTOM activity", () => {
      const presence = {
        activities: [
          {
            type: "CUSTOM",
            name: "Custom Status",
            state: "Feeling good",
            createdAt: new Date(),
          },
        ],
      } as Presence;

      const activity = worker["extractActivity"](presence);
      expect(activity).toEqual({
        type: "CUSTOM",
        details: {
          customDetails: {
            name: "Custom Status",
            state: "Feeling good",
          },
          startedAt: expect.any(Date),
        },
      });
    });

    it("should extract COMPETING activity", () => {
      const presence = {
        activities: [
          {
            type: "COMPETING",
            name: "Tournament",
            details: "Grand Finals",
            createdAt: new Date(),
          },
        ],
      } as Presence;

      const activity = worker["extractActivity"](presence);
      expect(activity).toEqual({
        type: "COMPETING",
        details: {
          competingDetails: {
            name: "Tournament",
            venue: "Grand Finals",
          },
          startedAt: expect.any(Date),
        },
      });
    });

    it("should return null for empty activities", () => {
      const mockPresence = {
        activities: [],
        status: "online",
        clientStatus: {},
        equals: () => false,
        guild: null,
        member: null,
        userId: "test-user",
      } as unknown as Presence;

      const activity = worker["extractActivity"](mockPresence);
      expect(activity).toBeNull();
    });
  });

  describe("isSameActivity", () => {
    it("should compare GAME activities", () => {
      const oldActivity: ActivityState = {
        type: "GAME",
        details: {
          gameName: "Minecraft",
          startedAt: new Date(),
        },
      };

      const newActivity: ActivityState = {
        type: "GAME",
        details: {
          gameName: "Minecraft",
          startedAt: new Date(),
        },
      };

      expect(worker["isSameActivity"](oldActivity, newActivity)).toBe(true);
    });

    it("should compare MUSIC activities", () => {
      const oldActivity: ActivityState = {
        type: "MUSIC",
        details: {
          musicDetails: {
            artist: "Artist",
            song: "Song",
            album: "Album",
          },
          startedAt: new Date(),
        },
      };

      const newActivity: ActivityState = {
        type: "MUSIC",
        details: {
          musicDetails: {
            artist: "Artist",
            song: "Song",
            album: "Different Album",
          },
          startedAt: new Date(),
        },
      };

      expect(worker["isSameActivity"](oldActivity, newActivity)).toBe(true);
    });

    // Add more tests for other activity types...
  });
});
