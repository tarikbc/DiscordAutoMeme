import { Router, Request, Response } from "express";
import { query, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { UserDocument } from "../../models/User";
import { authenticateJwt } from "../middleware/auth";
import { DiscordAccountService } from "../../services/DiscordAccountService";
import { ActivityService } from "../../services/ActivityService";
import { ContentService } from "../../services/ContentService";
import { SystemService } from "../../services/SystemService";

const router = Router();

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

    res.json({
      summary: {
        totalAccounts,
        activeAccounts,
      },
      accounts: accountStatuses,
    });
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

      // Get services
      const activityService = ActivityService.getInstance();
      const accountService = DiscordAccountService.getInstance();

      // Get user's accounts
      const accounts = await accountService.getAccountsByUser(user._id);
      const accountIds = accounts.map(account => account._id);

      // Get recent activity across all accounts
      const recentActivity = await activityService.getRecentActivityByAccountIds(accountIds, limit);

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

      res.json({
        activity: formattedActivity,
        total: formattedActivity.length,
      });
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

      res.json({
        summary: {
          totalDelivered: contentStats.total,
          byType: contentStats.byType,
        },
        daily: dailyStats,
        accounts: accountStats,
      });
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

    // Check if user has system metrics permission
    const hasPermission = await user.hasPermission("system:view_metrics");
    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Access denied. Requires system:view_metrics permission." });
    }

    // Get services
    const systemService = SystemService.getInstance();

    // Get system metrics
    const metrics = await systemService.getLatestMetrics();
    const usageHistory = await systemService.getMetricsHistory(12); // Last 12 hours

    res.json({
      current: {
        cpu: metrics?.cpuUsage || 0,
        memory: metrics?.memoryUsage || 0,
        threadCount: metrics?.threadCount || 0,
        activeClients: metrics?.activeClients || 0,
        activeUsers: metrics?.activeUsers || 0,
        requestsPerMinute: metrics?.requestsPerMinute || 0,
        errorRate: metrics?.errorRate || 0,
      },
      history: usageHistory.map(point => ({
        timestamp: point.timestamp,
        cpu: point.cpuUsage,
        memory: point.memoryUsage,
      })),
    });
  } catch (error) {
    logger.error("Failed to get dashboard system data:", error);
    res.status(500).json({ error: "Failed to get dashboard system data" });
  }
});

export default router;
