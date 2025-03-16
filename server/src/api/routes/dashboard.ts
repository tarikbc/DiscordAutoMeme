import { Router, Request, Response } from "express";
import { query, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { UserDocument } from "../../models/User";
import { authenticateJwt } from "../middleware/auth";
import { DiscordAccountService } from "../../services/DiscordAccountService";
import { ActivityService } from "../../services/ActivityService";
import { ContentService } from "../../services/ContentService";
import { SystemService } from "../../services/SystemService";
import cache from "../../utils/cache";

const router = Router();

// Cache TTL settings (in seconds)
const CACHE_TTL = {
  ACCOUNTS: 60, // 1 minute
  ACTIVITY: 60, // 1 minute
  CONTENT: 300, // 5 minutes
  SYSTEM: 120, // 2 minutes
};

// Middleware to require authentication for all routes
router.use(authenticateJwt);

/**
 * @swagger
 * /dashboard/accounts:
 *   get:
 *     summary: Get account statistics for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/accounts", async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDocument;
    const cacheKey = `dashboard:accounts:${user._id}`;

    // Try to get data from cache first
    const result = await cache.getOrSet(
      cacheKey,
      async () => {
        // Get services
        const accountService = DiscordAccountService.getInstance();
        const systemService = SystemService.getInstance();

        // Get account data
        const accounts = await accountService.getAccountsByUser(user._id);
        const accountStatuses = await Promise.all(
          accounts.map(async account => {
            const status = await systemService.getAccountStatus(account._id);
            return {
              id: account._id,
              name: account.name,
              status: status ? status.isConnected : false,
              uptime: status ? status.uptime : 0,
              lastActivity: status ? status.lastActivity : null,
            };
          }),
        );

        // Calculate summary statistics
        const totalAccounts = accounts.length;
        const activeAccounts = accountStatuses.filter(a => a.status).length;

        return {
          summary: {
            totalAccounts,
            activeAccounts,
          },
          accounts: accountStatuses,
        };
      },
      CACHE_TTL.ACCOUNTS,
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to get dashboard account data:", error);
    res.status(500).json({ error: "Failed to get dashboard account data" });
  }
});

/**
 * @swagger
 * /dashboard/activity:
 *   get:
 *     summary: Get recent activity for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Recent activity
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/activity",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = req.user as UserDocument;
      const limit = parseInt(req.query.limit as string) || 10;
      const cacheKey = `dashboard:activity:${user._id}:${limit}`;

      // Try to get data from cache first
      const result = await cache.getOrSet(
        cacheKey,
        async () => {
          // Get services
          const activityService = ActivityService.getInstance();
          const accountService = DiscordAccountService.getInstance();

          // Get user's accounts
          const accounts = await accountService.getAccountsByUser(user._id);
          const accountIds = accounts.map(account => account._id);

          // Get recent activity across all accounts
          const recentActivity = await activityService.getRecentActivityByAccountIds(
            accountIds,
            limit,
          );

          // Map activity data with account names
          const accountMap = new Map(accounts.map(a => [a._id.toString(), a.name]));
          const formattedActivity = recentActivity.map((activity: any) => ({
            id: activity._id,
            accountId: activity.accountId,
            accountName: accountMap.get(activity.accountId.toString()) || "Unknown Account",
            friendId: activity.friendId,
            friendUsername: activity.friendUsername,
            type: activity.type,
            timestamp: activity.timestamp,
            details: activity.details,
          }));

          return {
            activity: formattedActivity,
            total: formattedActivity.length,
          };
        },
        CACHE_TTL.ACTIVITY,
      );

      res.json(result);
    } catch (error) {
      logger.error("Failed to get dashboard activity data:", error);
      res.status(500).json({ error: "Failed to get dashboard activity data" });
    }
  },
);

/**
 * @swagger
 * /dashboard/content:
 *   get:
 *     summary: Get content delivery statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to include in stats
 *     responses:
 *       200:
 *         description: Content delivery statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/content",
  [
    query("days")
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage("Days must be between 1 and 30"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = req.user as UserDocument;
      const days = parseInt(req.query.days as string) || 7;
      const cacheKey = `dashboard:content:${user._id}:${days}`;

      // Try to get data from cache first
      const result = await cache.getOrSet(
        cacheKey,
        async () => {
          // Get services
          const contentService = ContentService.getInstance();
          const accountService = DiscordAccountService.getInstance();

          // Get user's accounts
          const accounts = await accountService.getAccountsByUser(user._id);
          const accountIds = accounts.map(account => account._id);

          // Get content statistics
          const contentStats = await contentService.getContentStatsByAccountIds(accountIds, days);

          // Calculate daily aggregates
          const dailyStats = contentStats.dailyStats.map(day => ({
            date: day.date,
            total: day.count,
            byType: day.byType,
          }));

          // Map account-specific stats with names
          const accountMap = new Map(accounts.map(a => [a._id.toString(), a.name]));
          const accountStats = contentStats.accountStats.map(stat => ({
            accountId: stat.accountId,
            accountName: accountMap.get(stat.accountId.toString()) || "Unknown Account",
            total: stat.count,
            byType: stat.byType,
          }));

          return {
            summary: {
              totalDelivered: contentStats.total,
              byType: contentStats.byType,
            },
            daily: dailyStats,
            accounts: accountStats,
          };
        },
        CACHE_TTL.CONTENT,
      );

      res.json(result);
    } catch (error) {
      logger.error("Failed to get dashboard content data:", error);
      res.status(500).json({ error: "Failed to get dashboard content data" });
    }
  },
);

/**
 * @swagger
 * /dashboard/system:
 *   get:
 *     summary: Get system metrics dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get("/system", async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDocument;

    // For system stats, cache per user since this may include admin-specific data
    const cacheKey = `dashboard:system:${user._id}`;

    // Try to get data from cache first
    const result = await cache.getOrSet(
      cacheKey,
      async () => {
        const systemService = SystemService.getInstance();
        return await systemService.getSystemMetrics();
      },
      CACHE_TTL.SYSTEM,
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to get dashboard system data:", error);
    res.status(500).json({ error: "Failed to get dashboard system data" });
  }
});

export default router;
