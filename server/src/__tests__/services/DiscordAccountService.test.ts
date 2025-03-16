import { DiscordAccountService } from "@/services/DiscordAccountService";
import cache from "@/utils/cache";
import { Types } from "mongoose";
import { DiscordAccount } from "@/models/DiscordAccount";
import { WorkerManager } from "@/workers/WorkerManager";

// Ensure cache is mocked
jest.mock("../../utils/cache", () => ({
  deleteByPrefix: jest.fn(),
  clear: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  getOrSet: jest.fn(),
}));

describe("Cache Invalidation", () => {
  let service: DiscordAccountService;
  let userId: Types.ObjectId;
  let accountId: Types.ObjectId;

  beforeEach(() => {
    service = DiscordAccountService.getInstance();
    userId = new Types.ObjectId();
    accountId = new Types.ObjectId();

    // Reset mock counts
    (cache.deleteByPrefix as jest.Mock).mockClear();
  });

  it("should invalidate dashboard cache when creating an account", async () => {
    // Mock implementations for this test
    jest.spyOn(DiscordAccount.prototype, "save").mockResolvedValueOnce({} as any);
    jest.spyOn(WorkerManager.prototype, "startWorker").mockImplementation(() => {});

    await service.createAccount({
      userId,
      name: "Test Account",
      token: "valid-token",
    });

    // Expect cache invalidation to be called with correct prefixes
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:accounts:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:activity:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:content:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:system:${userId.toString()}`);
  });

  it("should invalidate dashboard cache when updating an account", async () => {
    // Mock findByIdAndUpdate to return an account
    const mockAccount = {
      _id: accountId,
      userId,
      isActive: true,
      settings: {},
    };
    jest.spyOn(DiscordAccount, "findByIdAndUpdate").mockResolvedValueOnce(mockAccount as any);

    await service.updateAccount(accountId, { name: "Updated Name" });

    // Expect cache invalidation to be called with correct prefixes
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:accounts:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:activity:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:content:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:system:${userId.toString()}`);
  });

  it("should invalidate dashboard cache when deleting an account", async () => {
    // Mock findById to return an account
    const mockAccount = {
      _id: accountId,
      userId,
    };
    jest.spyOn(DiscordAccount, "findById").mockResolvedValueOnce(mockAccount as any);
    jest.spyOn(DiscordAccount, "findByIdAndDelete").mockResolvedValueOnce({} as any);

    await service.deleteAccount(accountId);

    // Expect cache invalidation to be called with correct prefixes
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:accounts:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:activity:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:content:${userId.toString()}`);
    expect(cache.deleteByPrefix).toHaveBeenCalledWith(`dashboard:system:${userId.toString()}`);
  });
});
