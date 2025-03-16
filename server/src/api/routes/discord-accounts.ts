import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { DiscordAccountService } from "../../services/DiscordAccountService";
import logger from "../../utils/logger";
import { discordAccountValidation } from "../middleware/validation";
import { validate } from "../middleware/validate";
import { apiLimiter, createAccountLimiter } from "../middleware/rateLimiter";

const router = Router();
const accountService = DiscordAccountService.getInstance();

// Apply rate limiting to all routes
router.use(apiLimiter);

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all Discord accounts for the authenticated user
 *     tags: [Discord Accounts]
 *     responses:
 *       200:
 *         description: List of Discord accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DiscordAccount'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = new Types.ObjectId("placeholder");
    const accounts = await accountService.getAccountsByUser(userId);
    res.json(accounts);
  } catch (error) {
    logger.error("Failed to get Discord accounts:", error);
    res.status(500).json({ error: "Failed to get Discord accounts" });
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get a specific Discord account
 *     tags: [Discord Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Discord account details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DiscordAccount'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid account ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  discordAccountValidation.getOne,
  validate,
  async (req: Request, res: Response) => {
    try {
      const accountId = new Types.ObjectId(req.params.id);
      const account = await accountService.getAccount(accountId);

      if (!account) {
        return res.status(404).json({ error: "Discord account not found" });
      }

      res.json(account);
    } catch (error) {
      logger.error("Failed to get Discord account:", error);
      res.status(500).json({ error: "Failed to get Discord account" });
    }
  },
);

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new Discord account
 *     tags: [Discord Accounts]
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
 *                 description: Account name
 *               token:
 *                 type: string
 *                 description: Discord token
 *               settings:
 *                 type: object
 *                 properties:
 *                   autoReconnect:
 *                     type: boolean
 *                   statusUpdateInterval:
 *                     type: number
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DiscordAccount'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  createAccountLimiter,
  discordAccountValidation.create,
  validate,
  async (req: Request, res: Response) => {
    try {
      const { name, token, settings } = req.body;
      // TODO: Get userId from auth middleware
      const userId = new Types.ObjectId("placeholder");

      const account = await accountService.createAccount({
        userId,
        name,
        token,
        settings,
      });

      res.status(201).json(account);
    } catch (error) {
      logger.error("Failed to create Discord account:", error);
      res.status(500).json({ error: "Failed to create Discord account" });
    }
  },
);

/**
 * @swagger
 * /accounts/{id}:
 *   patch:
 *     summary: Update a Discord account
 *     tags: [Discord Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               token:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DiscordAccount'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  "/:id",
  discordAccountValidation.update,
  validate,
  async (req: Request, res: Response) => {
    try {
      const accountId = new Types.ObjectId(req.params.id);
      const { name, token, isActive, settings } = req.body;

      const account = await accountService.updateAccount(accountId, {
        name,
        token,
        isActive,
        settings,
      });

      if (!account) {
        return res.status(404).json({ error: "Discord account not found" });
      }

      res.json(account);
    } catch (error) {
      logger.error("Failed to update Discord account:", error);
      res.status(500).json({ error: "Failed to update Discord account" });
    }
  },
);

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete a Discord account
 *     tags: [Discord Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       204:
 *         description: Account deleted successfully
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  "/:id",
  discordAccountValidation.delete,
  validate,
  async (req: Request, res: Response) => {
    try {
      const accountId = new Types.ObjectId(req.params.id);
      const success = await accountService.deleteAccount(accountId);

      if (!success) {
        return res.status(404).json({ error: "Discord account not found" });
      }

      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete Discord account:", error);
      res.status(500).json({ error: "Failed to delete Discord account" });
    }
  },
);

/**
 * @swagger
 * /accounts/{id}/start:
 *   post:
 *     summary: Start a Discord client
 *     tags: [Discord Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Client started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 account:
 *                   $ref: '#/components/schemas/DiscordAccount'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/:id/start",
  discordAccountValidation.getOne,
  validate,
  async (req: Request, res: Response) => {
    try {
      const accountId = new Types.ObjectId(req.params.id);
      const account = await accountService.getAccount(accountId);

      if (!account) {
        return res.status(404).json({ error: "Discord account not found" });
      }

      // Update account to active and start worker
      const updatedAccount = await accountService.updateAccount(accountId, {
        isActive: true,
      });

      res.json({
        message: "Discord client started",
        account: updatedAccount,
      });
    } catch (error) {
      logger.error("Failed to start Discord client:", error);
      res.status(500).json({ error: "Failed to start Discord client" });
    }
  },
);

/**
 * @swagger
 * /accounts/{id}/stop:
 *   post:
 *     summary: Stop a Discord client
 *     tags: [Discord Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Client stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 account:
 *                   $ref: '#/components/schemas/DiscordAccount'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/:id/stop",
  discordAccountValidation.getOne,
  validate,
  async (req: Request, res: Response) => {
    try {
      const accountId = new Types.ObjectId(req.params.id);
      const account = await accountService.getAccount(accountId);

      if (!account) {
        return res.status(404).json({ error: "Discord account not found" });
      }

      // Update account to inactive and stop worker
      const updatedAccount = await accountService.updateAccount(accountId, {
        isActive: false,
      });

      res.json({
        message: "Discord client stopped",
        account: updatedAccount,
      });
    } catch (error) {
      logger.error("Failed to stop Discord client:", error);
      res.status(500).json({ error: "Failed to stop Discord client" });
    }
  },
);

export default router;
