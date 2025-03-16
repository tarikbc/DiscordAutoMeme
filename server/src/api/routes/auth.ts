import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import logger from "../../utils/logger";
import { User, createUser, UserDocument } from "../../models/User";
import { authenticateLocal, authenticateJwt, loginRateLimiter } from "../middleware/auth";
import crypto from "crypto";
import config from "../../config";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
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
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Create new user
      const user = await createUser(email, password);

      // Generate tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Update last login time
      await user.updateLastLogin();

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: user._id,
          email: user.email,
          roles: user.roles,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      logger.error("Failed to register user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  },
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
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
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */
router.post(
  "/login",
  loginRateLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isString().withMessage("Password is required"),
  ],
  authenticateLocal,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as UserDocument;

      // Generate tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Update last login time
      await user.updateLastLogin();

      res.json({
        user: {
          id: user._id,
          email: user.email,
          roles: user.roles,
          setupCompleted: user.setupCompleted,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  },
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", authenticateJwt, (req: Request, res: Response) => {
  // Note: Since we're using stateless JWT tokens, there's no server-side session to destroy
  // In a production app, you might want to implement token blacklisting
  res.json({ success: true, message: "Logout successful" });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens generated
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Server error
 */
router.post(
  "/refresh",
  [body("refreshToken").isString().withMessage("Refresh token is required")],
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = require("jsonwebtoken").verify(refreshToken, config.jwt.refreshSecret);

      // Find user
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // Generate new tokens
      const token = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      res.json({ token, refreshToken: newRefreshToken });
    } catch (error) {
      logger.error("Token refresh error:", error);
      res.status(401).json({ error: "Invalid refresh token" });
    }
  },
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset request processed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });

      // Always return success even if user not found for security
      if (!user) {
        return res.json({
          success: true,
          message: "If your email is in our system, you will receive a password reset link",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(
        Date.now() + config.security.passwordResetExpires * 60 * 60 * 1000,
      );

      // Save token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save();

      // In a real app, send email with reset link
      // For now, just log the token (would be sent via email)
      logger.info(`Password reset token for ${email}: ${resetToken}`);

      res.json({
        success: true,
        message: "If your email is in our system, you will receive a password reset link",
      });
    } catch (error) {
      logger.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  },
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid input or token
 *       500:
 *         description: Server error
 */
router.post(
  "/reset-password",
  [
    body("token").isString().withMessage("Token is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, newPassword } = req.body;

      // Find user with valid token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Update password
      user.passwordHash = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      logger.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  },
);

export default router;
