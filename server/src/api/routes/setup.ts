import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { UserDocument } from "../../models/User";
import { authenticateJwt } from "../middleware/auth";
import { DiscordAccountService } from "../../services/DiscordAccountService";
import mongoose from "mongoose";
import { WorkerManager } from "../../workers/WorkerManager";
import { AccountService } from "../../services/AccountService";
import { AlertService } from "../../services/AlertService";
import { validate } from "../middleware/validate";

const router = Router();

// Middleware to require authentication for all routes
router.use(authenticateJwt);

/**
 * @swagger
 * /setup/status:
 *   get:
 *     summary: Get setup completion status
 *     tags: [Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup status
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDocument;

    // Get Discord accounts for this user
    const accountService = DiscordAccountService.getInstance();
    const accounts = await accountService.getAccountsByUser(user._id);

    // Define setup steps and their status
    const steps = [
      {
        id: "account",
        name: "Add Discord Account",
        completed: accounts.length > 0,
        description: "Add your first Discord account to get started",
      },
      {
        id: "setup",
        name: "Setup Complete",
        completed: user.setupCompleted,
        description: "Mark your setup as complete",
      },
    ];

    res.json({
      completed: user.setupCompleted,
      steps,
      accountCount: accounts.length,
    });
  } catch (error) {
    logger.error("Failed to get setup status:", error);
    res.status(500).json({ error: "Failed to get setup status" });
  }
});

/**
 * @swagger
 * /setup/account:
 *   post:
 *     summary: Add first Discord account during setup
 *     tags: [Setup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - token
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name for the account
 *               token:
 *                 type: string
 *                 description: Discord token
 *     responses:
 *       201:
 *         description: Account added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/account",
  [
    body("name").isString().isLength({ min: 1 }).withMessage("Account name is required"),
    body("token")
      .trim()
      .notEmpty()
      .withMessage("Discord token is required")
      .custom(value => {
        // Validate token format using AccountService
        const workerManager = WorkerManager.getInstance();
        const accountService = AccountService.getInstance(workerManager);
        if (!accountService.validateToken(value)) {
          throw new Error("Invalid Discord token format or structure");
        }
        return true;
      }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = req.user as UserDocument;
      const { name, token } = req.body;

      // Create account
      const accountService = DiscordAccountService.getInstance();
      const account = await accountService.createAccount({
        userId: new mongoose.Types.ObjectId(user._id),
        name,
        token,
      });

      res.status(201).json({
        success: true,
        account: {
          id: account._id,
          name: account.name,
          settings: account.settings,
          createdAt: account.createdAt,
        },
      });
    } catch (error) {
      logger.error("Failed to add account during setup:", error);
      res.status(500).json({ error: "Failed to add account during setup" });
    }
  },
);

/**
 * @swagger
 * /setup/complete:
 *   post:
 *     summary: Mark setup as complete
 *     tags: [Setup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup marked as complete
 *       400:
 *         description: Cannot complete setup without accounts
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/complete", async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDocument;

    // Check if user has at least one account
    const accountService = DiscordAccountService.getInstance();
    const accounts = await accountService.getAccountsByUser(user._id);

    if (accounts.length === 0) {
      return res.status(400).json({
        error: "Cannot complete setup",
        message: "You need to add at least one Discord account",
      });
    }

    // Mark setup as complete
    user.setupCompleted = true;
    await user.save();

    res.json({
      success: true,
      message: "Setup completed successfully",
    });
  } catch (error) {
    logger.error("Failed to complete setup:", error);
    res.status(500).json({ error: "Failed to complete setup" });
  }
});

/**
 * @swagger
 * /setup/alerts:
 *   post:
 *     summary: Set up initial alert configuration during first-time setup
 *     tags: [Setup]
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
 *                 default: true
 *               channelType:
 *                 type: string
 *                 enum: [email, webhook]
 *                 default: email
 *               destination:
 *                 type: string
 *                 description: Email address or webhook URL
 *     responses:
 *       200:
 *         description: Alert configuration saved
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/alerts",
  authenticateJwt,
  [
    body("enabled").optional().isBoolean(),
    body("channelType").optional().isIn(["email", "webhook"]),
    body("destination").optional().notEmpty(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as UserDocument;

      const { enabled = true, channelType = "email", destination } = req.body;

      // If destination not provided, use user's email as default
      const actualDestination = destination || user.email;

      // Create alert config
      const alertService = AlertService.getInstance();
      const config = await alertService.setAlertConfig(user._id, {
        enabled,
        channelType,
        destination: actualDestination,
      });

      logger.info(`Alert configuration set up for user ${user._id}`);

      res.json({
        success: true,
        message: "Alert configuration saved",
        config,
      });
    } catch (error) {
      logger.error("Error setting up alerts:", error);
      res.status(500).json({ error: "Failed to set up alerts" });
    }
  },
);

export default router;
