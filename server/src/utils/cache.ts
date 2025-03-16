import logger from "./logger";

interface CacheItem<T> {
  data: T;
  expiry: number;
}

class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem<any>> = new Map();

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Set data in cache with expiration time
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds Time to live in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiry });
    logger.debug(`Cache set: ${key}, expires in ${ttlSeconds}s`);
  }

  /**
   * Get data from cache
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      // Cache expired
      this.cache.delete(key);
      logger.debug(`Cache expired: ${key}`);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return item.data as T;
  }

  /**
   * Check if key exists in cache and is not expired
   * @param key Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Delete all keys that match a prefix
   * @param prefix Key prefix to match
   */
  deleteByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.debug(`Cache deleted ${keysToDelete.length} items with prefix: ${prefix}`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    logger.debug("Cache cleared");
  }

  /**
   * Get or set cache data with a callback function
   * @param key Cache key
   * @param callback Function to generate data if not in cache
   * @param ttlSeconds Time to live in seconds
   * @returns Cached or freshly generated data
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    // Check cache first
    const cachedData = this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    // Generate fresh data
    logger.debug(`Cache miss: ${key}, fetching data`);
    const data = await callback();
    this.set(key, data, ttlSeconds);
    return data;
  }
}

export default CacheManager.getInstance();
