import { Router, Request, Response } from "express";
import { body, query, param, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { User, UserDocument, createUser } from "../../models/User";
import { authenticateJwt } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { Role } from "../../models/Role";
import { Types } from "mongoose";

const router = Router();

// Middleware to protect all routes in this router
router.use(authenticateJwt);
router.use(requirePermission("users:view"));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user]
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (req.query.role) {
        filter.role = req.query.role;
      }

      // Get users with pagination
      const users = await User.find(filter)
        .select("-passwordHash -resetPasswordToken -resetPasswordExpires")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Get total count
      const total = await User.countDocuments(filter);

      res.json({
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      logger.error("Failed to get users:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  },
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID format")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id).select(
        "-passwordHash -resetPasswordToken -resetPasswordExpires",
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      logger.error(`Failed to get user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to get user" });
    }
  },
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role IDs
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put(
  "/:id",
  requirePermission("users:edit"),
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("roles").optional().isArray().withMessage("Roles must be an array"),
    body("roles.*").optional().isMongoId().withMessage("Each role ID must be valid"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update fields
      if (req.body.email) {
        user.email = req.body.email;
      }

      // Update roles if provided
      if (req.body.roles) {
        // Validate roles
        const validRoles = await Role.find({
          _id: { $in: req.body.roles },
        });

        if (validRoles.length !== req.body.roles.length) {
          return res.status(400).json({ error: "One or more role IDs are invalid" });
        }

        user.roles = req.body.roles.map((id: string) => new Types.ObjectId(id));
      }

      await user.save();

      // Send response
      return res.json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          roles: user.roles,
          setupCompleted: user.setupCompleted,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error(`Failed to update user ${req.params.id}:`, error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  },
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID format")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Don't allow users to delete themselves
      if ((req.user as UserDocument)._id.toString() === req.params.id) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }

      const result = await User.findByIdAndDelete(req.params.id);

      if (!result) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      logger.error(`Failed to delete user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role IDs
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  requirePermission("users:create"),
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("roles").optional().isArray().withMessage("Roles must be an array"),
    body("roles.*").optional().isMongoId().withMessage("Each role ID must be valid"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Create the user
      const user = await createUser(email, password);

      // Assign roles if provided
      if (req.body.roles && req.body.roles.length > 0) {
        // Validate roles
        const validRoles = await Role.find({
          _id: { $in: req.body.roles },
        });

        if (validRoles.length !== req.body.roles.length) {
          return res.status(400).json({ error: "One or more role IDs are invalid" });
        }

        user.roles = req.body.roles.map((id: string) => new Types.ObjectId(id));
        await user.save();
      }

      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          roles: user.roles,
          setupCompleted: user.setupCompleted,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logger.error("Failed to create user:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  },
);

export default router;
