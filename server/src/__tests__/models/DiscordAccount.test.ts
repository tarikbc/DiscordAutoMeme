import { Types } from "mongoose";
import { DiscordAccount, IDiscordAccountModel } from "../../models/DiscordAccount";

describe("DiscordAccount Model", () => {
  describe("Basic CRUD operations", () => {
    it("should create a discord account with basic fields", async () => {
      const account = await DiscordAccount.create({
        userId: new Types.ObjectId(),
        name: "Test Account",
        token: "test_token",
        isActive: true,
        settings: {
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
                end: "17:00",
              },
            ],
          },
        },
        status: {
          isConnected: false,
          lastConnection: null,
          lastDisconnection: null,
          currentActivity: null,
        },
        metrics: {
          messagesSent: 0,
          messagesReceived: 0,
          errors: 0,
          uptime: 0,
        },
      });

      expect(account).toBeDefined();
      expect(account.name).toBe("Test Account");
      expect(account.token).toBe("test_token");
      expect(account.isActive).toBe(true);
      expect(account.settings.autoReconnect).toBe(true);
      expect(account.settings.contentPreferences.memes).toBe(true);
      expect(account.settings.deliveryPreferences.timeWindows).toHaveLength(1);
      expect(account.status.isConnected).toBe(false);
      expect(account.metrics.messagesSent).toBe(0);
    });
  });

  describe("Instance methods", () => {
    let account: IDiscordAccountModel;

    beforeEach(async () => {
      account = await DiscordAccount.create({
        userId: new Types.ObjectId(),
        name: "Test Account",
        token: "test_token",
        isActive: true,
        settings: {
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
                end: "17:00",
              },
            ],
          },
        },
        status: {
          isConnected: false,
          lastConnection: null,
          lastDisconnection: null,
          currentActivity: null,
        },
        metrics: {
          messagesSent: 0,
          messagesReceived: 0,
          errors: 0,
          uptime: 0,
        },
      });
    });

    it("should update status", async () => {
      await account.updateStatus(true);
      expect(account.status.isConnected).toBe(true);
      expect(account.status.lastConnection).toBeDefined();
      expect(account.status.lastDisconnection).toBeNull();

      await account.updateStatus(false);
      expect(account.status.isConnected).toBe(false);
      expect(account.status.lastDisconnection).toBeDefined();
    });

    it("should update metrics", async () => {
      const newMetrics = {
        messagesSent: 10,
        messagesReceived: 5,
        errors: 1,
        uptime: 3600,
      };

      await account.updateMetrics(newMetrics);
      expect(account.metrics.messagesSent).toBe(10);
      expect(account.metrics.messagesReceived).toBe(5);
      expect(account.metrics.errors).toBe(1);
      expect(account.metrics.uptime).toBe(3600);
    });

    it("should update partial metrics", async () => {
      await account.updateMetrics({ messagesSent: 10 });
      expect(account.metrics.messagesSent).toBe(10);
      expect(account.metrics.messagesReceived).toBe(0);
      expect(account.metrics.errors).toBe(0);
      expect(account.metrics.uptime).toBe(0);
    });
  });
});
