import { Request, Response, NextFunction } from "express";
import { UserDocument } from "../../models/User";
import logger from "../../utils/logger";

/**
 * Middleware to check if the authenticated user has a specific permission
 * @param permission The permission code to check
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.user as UserDocument;

      // Check if user has the required permission
      const hasPermission = await user.hasPermission(permission);

      if (!hasPermission) {
        logger.warn(
          `Permission denied: ${user.email} attempted to access resource requiring ${permission}`,
        );
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      logger.error("Permission check error:", error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  };
};

/**
 * Middleware to check if the authenticated user has all of the specified permissions
 * @param permissions Array of permission codes to check
 */
export const requirePermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.user as UserDocument;

      // Check if user has all required permissions
      const hasPermissions = await user.hasPermissions(permissions);

      if (!hasPermissions) {
        logger.warn(
          `Permission denied: ${user.email} attempted to access resource requiring permissions ${permissions.join(", ")}`,
        );
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have all required permissions to access this resource",
        });
      }

      next();
    } catch (error) {
      logger.error("Permission check error:", error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  };
};

/**
 * Middleware to check if user owns a resource or has admin permission
 * This allows for "owner or admin" access control patterns
 * @param ownerIdPath Path to the owner ID in the request (e.g., "params.userId")
 * @param adminPermission Admin permission that bypasses ownership check
 */
export const requireOwnershipOrPermission = (ownerIdPath: string, adminPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.user as UserDocument;

      // Check if user has admin permission
      const hasAdminPermission = await user.hasPermission(adminPermission);

      if (hasAdminPermission) {
        // Admin permission allows access regardless of ownership
        return next();
      }

      // No admin permission, check ownership
      const ownerId = ownerIdPath.split(".").reduce((obj: any, path: string) => {
        return obj?.[path];
      }, req);

      if (!ownerId || ownerId.toString() !== user._id.toString()) {
        logger.warn(
          `Ownership or permission denied: ${user.email} attempted to access resource owned by ${ownerId}`,
        );
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      logger.error("Ownership check error:", error);
      return res.status(500).json({ error: "Error checking resource ownership" });
    }
  };
};
