import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../../models/RevokedToken";
import logger from "../../utils/logger";

/**
 * Middleware to verify if the JWT token has been revoked
 * This should be used after authenticateJwt middleware
 */
export const verifyTokenNotRevoked = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip if no authorization header or user not authenticated
    if (!req.headers.authorization || !req.user) {
      return next();
    }

    const token = req.headers.authorization.split(" ")[1]; // Extract JWT from "Bearer <token>"
    if (!token) {
      return next();
    }

    // Decode the token to get the jti claim
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (error) {
      logger.error("Failed to decode token:", error);
      return res.status(401).json({ error: "Invalid token" });
    }

    // If token doesn't have a jti claim, it's an old token format
    // Let it pass for backward compatibility
    if (!decoded || typeof decoded !== "object" || !decoded.jti) {
      return next();
    }

    // Check if token has been revoked
    const isRevoked = await isTokenRevoked(decoded.jti);
    if (isRevoked) {
      return res.status(401).json({ error: "Token has been revoked", code: "token_revoked" });
    }

    next();
  } catch (error) {
    logger.error("Token verification error:", error);
    return res.status(500).json({ error: "Error verifying token" });
  }
};

/**
 * Middleware for extracting token expiry to use in revocation
 * This adds tokenExpiry to the request object for use in revocation endpoints
 */
export const extractTokenExpiry = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.headers.authorization) {
      return next();
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.decode(token);
      if (decoded && typeof decoded === "object" && decoded.exp) {
        // Add token metadata to request for use in revocation endpoints
        (req as any).tokenMetadata = {
          jti: decoded.jti,
          expiresAt: new Date(decoded.exp * 1000), // Convert Unix timestamp to Date
        };
      }
    } catch (error) {
      logger.error("Failed to extract token expiry:", error);
    }

    next();
  } catch (error) {
    logger.error("Token expiry extraction error:", error);
    next();
  }
};
