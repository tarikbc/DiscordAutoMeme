import { TokenService } from "../services/TokenService";
import logger from "../utils/logger";

/**
 * Job to clean up expired tokens from the revoked tokens collection
 * This helps keep the collection size manageable
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const tokenService = TokenService.getInstance();
    const deletedCount = await tokenService.cleanupExpiredTokens();

    if (deletedCount > 0) {
      logger.info(`Token cleanup: Removed ${deletedCount} expired revoked tokens`);
    }
  } catch (error) {
    logger.error("Token cleanup job failed:", error);
  }
}

/**
 * Schedule the token cleanup job to run periodically
 * @param intervalMs Interval in milliseconds between cleanup runs
 */
export function scheduleTokenCleanup(intervalMs: number = 24 * 60 * 60 * 1000): NodeJS.Timeout {
  logger.info(`Scheduling token cleanup job to run every ${intervalMs / (60 * 60 * 1000)} hours`);

  // Run immediately on startup
  cleanupExpiredTokens();

  // Schedule periodic runs
  return setInterval(cleanupExpiredTokens, intervalMs);
}
