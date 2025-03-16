import { Router, Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { DiscordAccountService } from "../../services/DiscordAccountService";
import logger from "../../utils/logger";
import { discordAccountValidation } from "../middleware/validation";
import { validate } from "../middleware/validate";
import { apiLimiter, createAccountLimiter } from "../middleware/rateLimiter";
import { authenticateJwt } from "../middleware/auth";
import { body, query } from "express-validator";
import { UserDocument } from "../../models/User";
import { DiscordAccount } from "../../models/DiscordAccount";

const router = Router();
const accountService = DiscordAccountService.getInstance();

// Apply rate limiting and authentication to all routes
router.use(apiLimiter);
router.use(authenticateJwt);

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all Discord accounts for the authenticated user
 *     tags: [Discord Accounts]
 *     parameters:
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, isActive]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction (ascending or descending)
 *     responses:
 *       200:
 *         description: List of Discord accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DiscordAccount'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 sortBy:
 *                   type: string
 *                 sortOrder:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("sortBy")
      .optional()
      .isIn(["name", "createdAt", "isActive"])
      .withMessage("sortBy must be one of: name, createdAt, isActive"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("sortOrder must be either asc or desc"),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      // Get authenticated user
      const user = req.user as UserDocument;
      const userId = user._id;

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = ((req.query.sortOrder as string) || "desc") as "asc" | "desc";

      // Get accounts with pagination and sorting
      const result = await accountService.getAccountsByUserPaginated(
        userId,
        page,
        limit,
        sortBy,
        sortOrder,
      );

      res.json({
        accounts: result.accounts,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        sortBy,
        sortOrder,
      });
    } catch (error) {
      logger.error("Failed to get Discord accounts:", error);
      res.status(500).json({ error: "Failed to get Discord accounts" });
    }
  },
);

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
      // Get userId from authenticated user
      const user = req.user as UserDocument;
      const userId = user._id;

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

/**
 * Middleware to check if the user can perform batch operations on the specified accounts
 * Only allows operation if:
 * 1. User has accounts:edit_all permission, OR
 * 2. User has accounts:edit_own permission AND all accounts belong to the user
 */
const checkBatchPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountIds } = req.body;
    const user = req.user as UserDocument;

    // Check if user has global account edit permission
    const hasEditAllPermission = await user.hasPermission("accounts:edit_all");

    if (hasEditAllPermission) {
      // User can edit all accounts, proceed
      return next();
    }

    // Check if user has permission to edit their own accounts
    const hasEditOwnPermission = await user.hasPermission("accounts:edit_own");

    if (!hasEditOwnPermission) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to perform batch operations on accounts",
      });
    }

    // Verify all accounts belong to the user
    const accountObjectIds = accountIds.map((id: string) => new Types.ObjectId(id));
    const accounts = await DiscordAccount.find({
      _id: { $in: accountObjectIds },
    })
      .select("userId")
      .lean();

    // Check if we found the same number of accounts as requested
    if (accounts.length !== accountIds.length) {
      return res.status(404).json({
        error: "Not Found",
        message: "One or more accounts were not found",
      });
    }

    // Check if all accounts belong to the user
    const userIdString = user._id.toString();
    const unauthorized = accounts.some(account => account.userId.toString() !== userIdString);

    if (unauthorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only perform batch operations on your own accounts",
      });
    }

    // All accounts belong to the user, proceed
    next();
  } catch (error) {
    logger.error("Error checking batch permissions:", error);
    return res.status(500).json({ error: "Error checking permissions" });
  }
};

/**
 * @swagger
 * /accounts/batch/start:
 *   post:
 *     summary: Start multiple Discord clients
 *     tags: [Discord Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountIds
 *             properties:
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of account IDs to start
 *     responses:
 *       200:
 *         description: Batch operation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 successCount:
 *                   type: integer
 *                 failureCount:
 *                   type: integer
 *                 errors:
 *                   type: array
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/batch/start",
  [
    body("accountIds").isArray({ min: 1 }).withMessage("At least one account ID is required"),
    body("accountIds.*").isMongoId().withMessage("Valid MongoDB IDs are required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Specific check for start operations
    try {
      const user = req.user as UserDocument;

      // Either edit_all or edit_own is required to start accounts
      const hasEditAllPermission = await user.hasPermission("accounts:edit_all");
      if (hasEditAllPermission) {
        return next();
      }

      const hasEditOwnPermission = await user.hasPermission("accounts:edit_own");
      if (!hasEditOwnPermission) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to start accounts",
        });
      }

      // Continue to regular batch permission check
      next();
    } catch (error) {
      logger.error("Error checking batch start permissions:", error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  },
  checkBatchPermissions,
  async (req: Request, res: Response) => {
    try {
      const { accountIds } = req.body;
      const user = req.user as UserDocument;
      const userId = user._id;

      // Convert string IDs to ObjectIds
      const accountObjectIds = accountIds.map((id: string) => new Types.ObjectId(id));

      const result = await accountService.batchStartAccounts(accountObjectIds, userId);

      res.json(result);
    } catch (error) {
      logger.error("Failed to batch start Discord accounts:", error);
      res.status(500).json({ error: "Failed to batch start Discord accounts" });
    }
  },
);

/**
 * @swagger
 * /accounts/batch/stop:
 *   post:
 *     summary: Stop multiple Discord clients
 *     tags: [Discord Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountIds
 *             properties:
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of account IDs to stop
 *     responses:
 *       200:
 *         description: Batch operation results
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/batch/stop",
  [
    body("accountIds").isArray({ min: 1 }).withMessage("At least one account ID is required"),
    body("accountIds.*").isMongoId().withMessage("Valid MongoDB IDs are required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Specific check for stop operations
    try {
      const user = req.user as UserDocument;

      // Either edit_all or edit_own is required to stop accounts
      const hasEditAllPermission = await user.hasPermission("accounts:edit_all");
      if (hasEditAllPermission) {
        return next();
      }

      const hasEditOwnPermission = await user.hasPermission("accounts:edit_own");
      if (!hasEditOwnPermission) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to stop accounts",
        });
      }

      // Continue to regular batch permission check
      next();
    } catch (error) {
      logger.error("Error checking batch stop permissions:", error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  },
  checkBatchPermissions,
  async (req: Request, res: Response) => {
    try {
      const { accountIds } = req.body;
      const user = req.user as UserDocument;
      const userId = user._id;

      // Convert string IDs to ObjectIds
      const accountObjectIds = accountIds.map((id: string) => new Types.ObjectId(id));

      const result = await accountService.batchStopAccounts(accountObjectIds, userId);

      res.json(result);
    } catch (error) {
      logger.error("Failed to batch stop Discord accounts:", error);
      res.status(500).json({ error: "Failed to batch stop Discord accounts" });
    }
  },
);

/**
 * @swagger
 * /accounts/batch/delete:
 *   post:
 *     summary: Delete multiple Discord accounts
 *     tags: [Discord Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountIds
 *             properties:
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of account IDs to delete
 *     responses:
 *       200:
 *         description: Batch operation results
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/batch/delete",
  [
    body("accountIds").isArray({ min: 1 }).withMessage("At least one account ID is required"),
    body("accountIds.*").isMongoId().withMessage("Valid MongoDB IDs are required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Special check for delete operations - requires delete permissions
    try {
      const user = req.user as UserDocument;

      // Check global delete permission
      const hasDeleteAllPermission = await user.hasPermission("accounts:delete_all");
      if (hasDeleteAllPermission) {
        return next();
      }

      // Check own delete permission
      const hasDeleteOwnPermission = await user.hasPermission("accounts:delete_own");
      if (!hasDeleteOwnPermission) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to delete accounts",
        });
      }

      // Continue to regular batch permission check
      next();
    } catch (error) {
      logger.error("Error checking batch delete permissions:", error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  },
  checkBatchPermissions,
  async (req: Request, res: Response) => {
    try {
      const { accountIds } = req.body;
      const user = req.user as UserDocument;
      const userId = user._id;

      // Convert string IDs to ObjectIds
      const accountObjectIds = accountIds.map((id: string) => new Types.ObjectId(id));

      const result = await accountService.batchDeleteAccounts(accountObjectIds, userId);

      res.json(result);
    } catch (error) {
      logger.error("Failed to batch delete Discord accounts:", error);
      res.status(500).json({ error: "Failed to batch delete Discord accounts" });
    }
  },
);

/**
 * @swagger
 * /accounts/batch/update-settings:
 *   post:
 *     summary: Update settings for multiple Discord accounts
 *     tags: [Discord Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountIds
 *               - settings
 *             properties:
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of account IDs to update
 *               settings:
 *                 type: object
 *                 description: Settings to update for all accounts
 *     responses:
 *       200:
 *         description: Batch operation results
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/batch/update-settings",
  [
    body("accountIds").isArray({ min: 1 }).withMessage("At least one account ID is required"),
    body("accountIds.*").isMongoId().withMessage("Valid MongoDB IDs are required"),
    body("settings").isObject().withMessage("Settings object is required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Specific check for update settings operations
    try {
      const user = req.user as UserDocument;

      // Either edit_all or edit_own is required to update account settings
      const hasEditAllPermission = await user.hasPermission("accounts:edit_all");
      if (hasEditAllPermission) {
        return next();
      }

      const hasEditOwnPermission = await user.hasPermission("accounts:edit_own");
      if (!hasEditOwnPermission) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to update account settings",
        });
      }

      // Continue to regular batch permission check
      next();
    } catch (error) {
      logger.error("Error checking batch update permissions:", error);
      return res.status(500).json({ error: "Error checking permissions" });
    }
  },
  checkBatchPermissions,
  async (req: Request, res: Response) => {
    try {
      const { accountIds, settings } = req.body;
      const user = req.user as UserDocument;
      const userId = user._id;

      // Convert string IDs to ObjectIds
      const accountObjectIds = accountIds.map((id: string) => new Types.ObjectId(id));

      const result = await accountService.batchUpdateAccountSettings(
        accountObjectIds,
        settings,
        userId,
      );

      res.json(result);
    } catch (error) {
      logger.error("Failed to batch update Discord account settings:", error);
      res.status(500).json({ error: "Failed to batch update Discord account settings" });
    }
  },
);

export default router;
