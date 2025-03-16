import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import {
  revokeToken,
  isTokenRevoked,
  getRevokedTokensByUser,
  cleanupExpiredTokens,
} from "../models/RevokedToken";
import logger from "../utils/logger";
import config from "../config";

export class TokenService {
  private static instance: TokenService;

  private constructor() {}

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Revoke a specific token
   * @param token The JWT token to revoke
   * @param reason The reason for revocation
   */
  async revokeJwtToken(token: string, reason: string = "logout"): Promise<boolean> {
    try {
      // Decode the token to get its claims
      const decoded = jwt.decode(token);

      if (!decoded || typeof decoded !== "object") {
        logger.error("Failed to decode token for revocation");
        return false;
      }

      if (!decoded.jti) {
        logger.error("Token does not have a jti claim for revocation");
        return false;
      }

      const userId = decoded.id;

      // Calculate expiry date
      let expiresAt: Date;
      if (decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000); // Convert Unix timestamp to Date
      } else {
        // If no expiry in the token, use default from config
        const expiresInMs =
          typeof config.jwt.expiresIn === "string"
            ? ms(config.jwt.expiresIn)
            : config.jwt.expiresIn;
        expiresAt = new Date(Date.now() + expiresInMs);
      }

      // Add to revoked tokens
      await revokeToken(decoded.jti, new Types.ObjectId(userId), expiresAt, reason);

      return true;
    } catch (error) {
      logger.error("Error revoking token:", error);
      return false;
    }
  }

  /**
   * Revoke all tokens for a specific user
   * @param userId The user ID
   * @param reason The reason for revocation
   */
  async revokeAllUserTokens(
    userId: Types.ObjectId,
    reason: string = "admin_action",
  ): Promise<number> {
    try {
      // We can't know all active tokens, so we create a blacklist timestamp
      // Any token issued before this timestamp will be considered revoked
      const timestamp = new Date();

      // Store a special "all tokens" revocation record
      await revokeToken(
        `all_tokens_${userId}_${timestamp.getTime()}`,
        userId,
        new Date(timestamp.getTime() + ms(config.jwt.refreshExpiresIn)), // Use the refresh token expiry as maximum
        reason,
      );

      // Return 1 to indicate success (we're creating one revocation record)
      return 1;
    } catch (error) {
      logger.error(`Error revoking all tokens for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check if a token has been revoked
   * @param tokenId The token ID (jti claim)
   */
  isTokenRevoked(tokenId: string): Promise<boolean> {
    return isTokenRevoked(tokenId);
  }

  /**
   * Get all revoked tokens for a user
   * @param userId The user ID
   */
  getRevokedTokensByUser(userId: Types.ObjectId): Promise<any[]> {
    return getRevokedTokensByUser(userId);
  }

  /**
   * Clean up expired token records
   * This can be called periodically to keep the database clean
   */
  cleanupExpiredTokens(): Promise<number> {
    return cleanupExpiredTokens();
  }
}

// Helper to convert string time to milliseconds
function ms(timeString: string): number {
  const regex = /^(\d+)([smhdw])$/;
  const match = timeString.match(regex);

  if (!match) {
    return 3600000; // Default to 1 hour if format is invalid
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return value * 60 * 60 * 1000; // Default to hours
  }
}
