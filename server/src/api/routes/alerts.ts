import { Router, Request, Response } from "express";
import { body, param, query } from "express-validator";
import { Types } from "mongoose";
import { AlertService } from "../../services/AlertService";
import logger from "../../utils/logger";
import { authenticateJwt } from "../middleware/auth";
import { UserDocument } from "../../models/User";
import { validate } from "../middleware/validate";

const router = Router();
const alertService = AlertService.getInstance();

// Apply authentication to all routes
router.use(authenticateJwt);

/**
 * @swagger
 * /alerts/config:
 *   get:
 *     summary: Get alert configuration for the authenticated user
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's alert configuration
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/config", async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDocument;
    const config = await alertService.getAlertConfig(user._id);

    if (!config) {
      // Return default config if none exists
      return res.json({
        enabled: true,
        channelType: "email",
        destination: user.email,
        triggers: {
          connectionLost: true,
          highErrorRate: true,
          tokenInvalid: true,
          rateLimited: true,
        },
        thresholds: {
          errorRateThreshold: 5,
          disconnectionThreshold: 3,
        },
        cooldown: 15,
      });
    }

    res.json(config);
  } catch (error) {
    logger.error("Failed to get alert configuration:", error);
    res.status(500).json({ error: "Failed to get alert configuration" });
  }
});

/**
 * @swagger
 * /alerts/config:
 *   post:
 *     summary: Create or update alert configuration
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               channelType:
 *                 type: string
 *                 enum: [email, webhook]
 *               destination:
 *                 type: string
 *               triggers:
 *                 type: object
 *               thresholds:
 *                 type: object
 *               cooldown:
 *                 type: number
 *     responses:
 *       200:
 *         description: Alert configuration updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/config",
  [
    body("enabled").optional().isBoolean(),
    body("channelType").optional().isIn(["email", "webhook"]),
    body("destination").optional().notEmpty(),
    body("triggers").optional().isObject(),
    body("triggers.connectionLost").optional().isBoolean(),
    body("triggers.highErrorRate").optional().isBoolean(),
    body("triggers.tokenInvalid").optional().isBoolean(),
    body("triggers.rateLimited").optional().isBoolean(),
    body("thresholds").optional().isObject(),
    body("thresholds.errorRateThreshold").optional().isInt({ min: 1 }),
    body("thresholds.disconnectionThreshold").optional().isInt({ min: 1 }),
    body("cooldown").optional().isInt({ min: 1 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as UserDocument;
      const config = await alertService.setAlertConfig(user._id, req.body);

      res.json(config);
    } catch (error) {
      logger.error("Failed to update alert configuration:", error);
      res.status(500).json({ error: "Failed to update alert configuration" });
    }
  },
);

/**
 * @swagger
 * /alerts/history:
 *   get:
 *     summary: Get alert history for the authenticated user
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Filter by account ID
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolved status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of alerts
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/history",
  [
    query("accountId").optional().isMongoId(),
    query("resolved").optional().isBoolean(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as UserDocument;

      const accountId = req.query.accountId
        ? new Types.ObjectId(req.query.accountId as string)
        : undefined;

      const resolved =
        req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const result = await alertService.getAlertHistory(user._id, accountId, resolved, limit, skip);

      res.json({
        alerts: result.alerts,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      logger.error("Failed to get alert history:", error);
      res.status(500).json({ error: "Failed to get alert history" });
    }
  },
);

/**
 * @swagger
 * /alerts/{id}/resolve:
 *   post:
 *     summary: Mark an alert as resolved
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert marked as resolved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/resolve",
  [param("id").isMongoId()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const alertId = new Types.ObjectId(req.params.id);
      const alert = await alertService.resolveAlert(alertId);

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json({ success: true, alert });
    } catch (error) {
      logger.error(`Failed to resolve alert ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  },
);

export default router;
