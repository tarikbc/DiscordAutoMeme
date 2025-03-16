import { Router, Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { Types } from "mongoose";
import logger from "../../utils/logger";
import { Role, seedRoles } from "../../models/Role";
import { Permission } from "../../models/Permission";
import { User, UserDocument } from "../../models/User";
import { authenticateJwt } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const router = Router();

// Protect all routes
router.use(authenticateJwt);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/", requirePermission("roles:manage"), async (req: Request, res: Response) => {
  try {
    // Get roles with permissions populated
    const roles = await Role.find().populate("permissions").sort({ name: 1 });

    res.json({
      roles,
      count: roles.length,
    });
  } catch (error) {
    logger.error("Failed to get roles:", error);
    res.status(500).json({ error: "Failed to get roles" });
  }
});

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  requirePermission("roles:manage"),
  [param("id").isMongoId().withMessage("Invalid role ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const role = await Role.findById(req.params.id).populate("permissions");

      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      res.json({ role });
    } catch (error) {
      logger.error(`Failed to get role ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to get role" });
    }
  },
);

/**
 * @swagger
 * /roles/seed:
 *   post:
 *     summary: Seed default roles (admin only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles seeded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post("/seed", requirePermission("roles:manage"), async (req: Request, res: Response) => {
  try {
    const roleIds = await seedRoles();

    res.json({
      success: true,
      message: `${roleIds.size} roles seeded successfully`,
      roles: Array.from(roleIds.keys()),
    });
  } catch (error) {
    logger.error("Failed to seed roles:", error);
    res.status(500).json({ error: "Failed to seed roles" });
  }
});

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
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
 *               - description
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name
 *               description:
 *                 type: string
 *                 description: Role description
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission IDs
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  requirePermission("roles:manage"),
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Valid name is required"),
    body("description")
      .isString()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Description is required"),
    body("permissions").isArray().withMessage("Permissions must be an array of permission IDs"),
    body("permissions.*").isMongoId().withMessage("Each permission must be a valid ID"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, permissions } = req.body;

      // Check if role already exists
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({ error: "Role with this name already exists" });
      }

      // Validate permissions
      const validPermissions = await Permission.find({
        _id: { $in: permissions },
      });

      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ error: "One or more permission IDs are invalid" });
      }

      // Create role
      const role = await Role.create({
        name,
        description,
        permissions,
        isSystem: false,
      });

      // Populate permissions for response
      await role.populate("permissions");

      res.status(201).json({
        success: true,
        message: "Role created successfully",
        role,
      });
    } catch (error) {
      logger.error("Failed to create role:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  },
);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name
 *               description:
 *                 type: string
 *                 description: Role description
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission IDs
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  requirePermission("roles:manage"),
  [
    param("id").isMongoId().withMessage("Invalid role ID"),
    body("name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Valid name is required"),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Valid description is required"),
    body("permissions")
      .optional()
      .isArray()
      .withMessage("Permissions must be an array of permission IDs"),
    body("permissions.*").optional().isMongoId().withMessage("Each permission must be a valid ID"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find role
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      // Check if trying to update a system role
      if (role.isSystem && (req.body.name || req.body.permissions)) {
        return res.status(400).json({
          error: "Cannot modify name or permissions of system roles",
          message: "System roles are protected. You can only update the description.",
        });
      }

      // Update fields
      const { name, description, permissions } = req.body;

      if (name) {
        // Check name uniqueness
        const existingRole = await Role.findOne({ name, _id: { $ne: role._id } });
        if (existingRole) {
          return res.status(400).json({ error: "Role with this name already exists" });
        }
        role.name = name;
      }

      if (description) {
        role.description = description;
      }

      if (permissions) {
        // Validate permissions
        const validPermissions = await Permission.find({
          _id: { $in: permissions },
        });

        if (validPermissions.length !== permissions.length) {
          return res.status(400).json({ error: "One or more permission IDs are invalid" });
        }

        role.permissions = permissions.map((id: string) => new Types.ObjectId(id));
      }

      await role.save();

      // Populate permissions for response
      await role.populate("permissions");

      res.json({
        success: true,
        message: "Role updated successfully",
        role,
      });
    } catch (error) {
      logger.error(`Failed to update role ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update role" });
    }
  },
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Cannot delete system role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  requirePermission("roles:manage"),
  [param("id").isMongoId().withMessage("Invalid role ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find role
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      // Check if system role
      if (role.isSystem) {
        return res.status(400).json({
          error: "Cannot delete system role",
          message: "System roles are protected and cannot be deleted.",
        });
      }

      // Check if role is in use
      const usersWithRole = await User.countDocuments({ roles: role._id });
      if (usersWithRole > 0) {
        return res.status(400).json({
          error: "Role is in use",
          message: `This role is assigned to ${usersWithRole} user(s). Remove it from all users before deleting.`,
        });
      }

      // Delete role
      await role.deleteOne();

      res.json({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      logger.error(`Failed to delete role ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  },
);

/**
 * @swagger
 * /roles/assign/{userId}:
 *   post:
 *     summary: Assign roles to a user
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roles
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role IDs
 *     responses:
 *       200:
 *         description: Roles assigned successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post(
  "/assign/:userId",
  requirePermission("roles:manage"),
  [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    body("roles").isArray().withMessage("Roles must be an array of role IDs"),
    body("roles.*").isMongoId().withMessage("Each role must be a valid ID"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { roles } = req.body;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate roles
      const validRoles = await Role.find({
        _id: { $in: roles },
      });

      if (validRoles.length !== roles.length) {
        return res.status(400).json({ error: "One or more role IDs are invalid" });
      }

      // Assign roles
      user.roles = roles.map((id: string) => new Types.ObjectId(id));
      await user.save();

      // Populate roles for response
      await user.populate({
        path: "roles",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      });

      res.json({
        success: true,
        message: "Roles assigned successfully",
        user: {
          _id: user._id,
          email: user.email,
          roles: user.roles,
        },
      });
    } catch (error) {
      logger.error(`Failed to assign roles to user ${req.params.userId}:`, error);
      res.status(500).json({ error: "Failed to assign roles" });
    }
  },
);

/**
 * @swagger
 * /roles/user/{userId}:
 *   get:
 *     summary: Get user roles and permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User roles and permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  "/user/:userId",
  requirePermission("roles:manage"),
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;

      // Find user
      const user = await User.findById(userId).populate({
        path: "roles",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's permissions
      const permissions = await user.getPermissions();

      res.json({
        user: {
          _id: user._id,
          email: user.email,
        },
        roles: user.roles,
        permissions,
      });
    } catch (error) {
      logger.error(`Failed to get user roles ${req.params.userId}:`, error);
      res.status(500).json({ error: "Failed to get user roles" });
    }
  },
);

/**
 * @swagger
 * /roles/my-permissions:
 *   get:
 *     summary: Get current user's permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's permissions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/my-permissions", async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDocument;

    // Get user's permissions
    const permissions = await user.getPermissions();

    res.json({
      permissions,
      roles: user.roles,
    });
  } catch (error) {
    logger.error("Failed to get current user permissions:", error);
    res.status(500).json({ error: "Failed to get permissions" });
  }
});

export default router;
