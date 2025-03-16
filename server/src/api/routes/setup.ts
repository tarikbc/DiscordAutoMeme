import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { UserDocument } from "../../models/User";
import { authenticateJwt } from "../middleware/auth";
import { DiscordAccountService } from "../../services/DiscordAccountService";
import mongoose from "mongoose";

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
      .isString()
      .isLength({ min: 50, max: 100 })
      .withMessage("Valid Discord token is required"),
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

export default router;
