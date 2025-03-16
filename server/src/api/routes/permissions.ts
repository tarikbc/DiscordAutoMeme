import { Router, Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { Permission, SYSTEM_PERMISSIONS } from "../../models/Permission";
import { authenticateJwt } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const router = Router();

// Protect all routes
router.use(authenticateJwt);

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter permissions by category
 *     responses:
 *       200:
 *         description: List of permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/", requirePermission("roles:manage"), async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    // Build query
    const query: any = {};
    if (category) {
      query.category = category;
    }

    // Get permissions
    const permissions = await Permission.find(query).sort({ category: 1, code: 1 });

    // Group by category
    const groupedPermissions = permissions.reduce((acc: any, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});

    res.json({
      permissions,
      groupedPermissions,
      count: permissions.length,
    });
  } catch (error) {
    logger.error("Failed to get permissions:", error);
    res.status(500).json({ error: "Failed to get permissions" });
  }
});

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  requirePermission("roles:manage"),
  [param("id").isMongoId().withMessage("Invalid permission ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const permission = await Permission.findById(req.params.id);

      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      res.json({ permission });
    } catch (error) {
      logger.error(`Failed to get permission ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to get permission" });
    }
  },
);

/**
 * @swagger
 * /permissions/seed:
 *   post:
 *     summary: Seed default permissions (admin only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions seeded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post("/seed", requirePermission("roles:manage"), async (req: Request, res: Response) => {
  try {
    // Seed default permissions
    const createdPermissions = [];

    for (const permission of SYSTEM_PERMISSIONS) {
      const created = await Permission.findOneAndUpdate({ code: permission.code }, permission, {
        upsert: true,
        new: true,
      });

      createdPermissions.push(created);
    }

    res.json({
      success: true,
      message: `${createdPermissions.length} permissions seeded successfully`,
    });
  } catch (error) {
    logger.error("Failed to seed permissions:", error);
    res.status(500).json({ error: "Failed to seed permissions" });
  }
});

/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission (admin only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - description
 *               - category
 *             properties:
 *               code:
 *                 type: string
 *                 description: Unique permission code (e.g., "users:edit")
 *               name:
 *                 type: string
 *                 description: Human-readable name
 *               description:
 *                 type: string
 *                 description: Description of what the permission allows
 *               category:
 *                 type: string
 *                 description: Permission category
 *     responses:
 *       201:
 *         description: Permission created successfully
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
    body("code")
      .isString()
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-z]+:[a-z_]+$/)
      .withMessage("Permission code must be in format 'category:action_name'"),
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
    body("category")
      .isString()
      .isIn(["accounts", "users", "system", "content"])
      .withMessage("Category must be one of: accounts, users, system, content"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, name, description, category } = req.body;

      // Check if permission already exists
      const existingPermission = await Permission.findOne({ code });
      if (existingPermission) {
        return res.status(400).json({ error: "Permission with this code already exists" });
      }

      // Create permission
      const permission = await Permission.create({
        code,
        name,
        description,
        category,
      });

      res.status(201).json({
        success: true,
        message: "Permission created successfully",
        permission,
      });
    } catch (error) {
      logger.error("Failed to create permission:", error);
      res.status(500).json({ error: "Failed to create permission" });
    }
  },
);

/**
 * @swagger
 * /permissions/{id}:
 *   put:
 *     summary: Update a permission (admin only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Human-readable name
 *               description:
 *                 type: string
 *                 description: Description of what the permission allows
 *               category:
 *                 type: string
 *                 description: Permission category
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  requirePermission("roles:manage"),
  [
    param("id").isMongoId().withMessage("Invalid permission ID"),
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
    body("category")
      .optional()
      .isString()
      .isIn(["accounts", "users", "system", "content"])
      .withMessage("Category must be one of: accounts, users, system, content"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Find permission
      const permission = await Permission.findById(req.params.id);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      // Update fields
      const { name, description, category } = req.body;

      if (name) permission.name = name;
      if (description) permission.description = description;
      if (category) permission.category = category;

      await permission.save();

      res.json({
        success: true,
        message: "Permission updated successfully",
        permission,
      });
    } catch (error) {
      logger.error(`Failed to update permission ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update permission" });
    }
  },
);

export default router;
