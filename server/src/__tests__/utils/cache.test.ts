import cache from "../../utils/cache";

// Mock the logger
jest.mock("../../utils/logger", () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("CacheManager", () => {
  beforeEach(() => {
    // Clear the cache before each test
    cache.clear();
  });

  describe("set and get", () => {
    it("should store and retrieve values correctly", () => {
      const key = "test-key";
      const data = { id: 1, name: "Test" };

      cache.set(key, data);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(data);
    });

    it("should return null for non-existent keys", () => {
      const result = cache.get("non-existent-key");
      expect(result).toBeNull();
    });

    it("should respect the TTL and expire items", async () => {
      const key = "short-lived";
      cache.set(key, "data", 0.1); // 100ms TTL

      expect(cache.get(key)).toBe("data");

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get(key)).toBeNull();
    });
  });

  describe("has", () => {
    it("should correctly check if a key exists", () => {
      cache.set("exists", "value");

      expect(cache.has("exists")).toBe(true);
      expect(cache.has("does-not-exist")).toBe(false);
    });

    it("should return false for expired items", async () => {
      cache.set("expires-soon", "value", 0.1); // 100ms TTL

      expect(cache.has("expires-soon")).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.has("expires-soon")).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete a specific key", () => {
      cache.set("to-delete", "value");
      expect(cache.get("to-delete")).toBe("value");

      cache.delete("to-delete");
      expect(cache.get("to-delete")).toBeNull();
    });
  });

  describe("deleteByPrefix", () => {
    it("should delete all keys with a matching prefix", () => {
      cache.set("user:1:profile", "profile data");
      cache.set("user:1:settings", "settings data");
      cache.set("user:2:profile", "other profile");

      cache.deleteByPrefix("user:1:");

      expect(cache.get("user:1:profile")).toBeNull();
      expect(cache.get("user:1:settings")).toBeNull();
      expect(cache.get("user:2:profile")).not.toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all cache entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.clear();

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("getOrSet", () => {
    it("should return cached value when available", async () => {
      const key = "cached-key";
      const data = { id: 123 };
      cache.set(key, data);

      const callback = jest.fn().mockResolvedValue({ id: 456 });
      const result = await cache.getOrSet(key, callback);

      expect(result).toEqual(data);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should call the callback and store result when not cached", async () => {
      const key = "not-cached";
      const data = { id: 789 };
      const callback = jest.fn().mockResolvedValue(data);

      const result = await cache.getOrSet(key, callback);

      expect(result).toEqual(data);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(cache.get(key)).toEqual(data);
    });
  });
});
