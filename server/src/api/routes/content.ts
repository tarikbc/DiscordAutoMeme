import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { ContentService } from "../../services/ContentService";
import logger from "../../utils/logger";

const router = Router();
const contentService = ContentService.getInstance();

/**
 * @swagger
 * /content/search:
 *   post:
 *     summary: Search for content based on activity type and query
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityType
 *               - query
 *             properties:
 *               activityType:
 *                 type: string
 *                 enum: [GAME, MUSIC, STREAMING, WATCHING, CUSTOM, COMPETING]
 *                 description: Type of activity to search content for
 *               query:
 *                 type: string
 *                 description: Search query based on activity
 *               count:
 *                 type: number
 *                 description: Number of results to return (default is 5)
 *               filters:
 *                 type: object
 *                 properties:
 *                   excludeKeywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                   includeKeywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                   minRating:
 *                     type: number
 *                   maxRating:
 *                     type: number
 *     responses:
 *       200:
 *         description: Successfully retrieved content
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   title:
 *                     type: string
 *                   source:
 *                     type: string
 *                   type:
 *                     type: string
 *                   metadata:
 *                     type: object
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { activityType, query, count, filters } = req.body;
    const results = await contentService.searchContent({
      type: activityType,
      query,
      count,
      filters,
    });
    res.json(results);
  } catch (error) {
    logger.error("Failed to search content:", error);
    res.status(500).json({ error: "Failed to search content" });
  }
});

/**
 * @swagger
 * /content/history/{friendId}:
 *   get:
 *     summary: Get content history for a specific friend
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the friend to get content history for
 *     responses:
 *       200:
 *         description: Successfully retrieved content history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   content:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       link:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 *                   activityType:
 *                     type: string
 *                     enum: [GAME, MUSIC, STREAMING, WATCHING, CUSTOM, COMPETING]
 *                   delivered:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid friend ID
 *       404:
 *         description: Friend not found
 *       500:
 *         description: Server error
 */
router.get("/history/:friendId", async (req: Request, res: Response) => {
  try {
    const friendId = new Types.ObjectId(req.params.friendId);
    const history = await contentService.getFriendContentHistory(friendId);
    res.json(history);
  } catch (error) {
    if (error instanceof Error && error.name === "CastError") {
      res.status(400).json({ error: "Invalid friend ID" });
      return;
    }
    logger.error("Failed to get content history:", error);
    res.status(500).json({ error: "Failed to get content history" });
  }
});

/**
 * @swagger
 * /content/history/{friendId}/delivered:
 *   patch:
 *     summary: Update delivery status of content for a friend
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the friend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentId
 *               - delivered
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: ID of the content to update
 *               delivered:
 *                 type: boolean
 *                 description: New delivery status
 *     responses:
 *       200:
 *         description: Successfully updated delivery status
 *       400:
 *         description: Invalid friend ID or content ID
 *       404:
 *         description: Friend or content not found
 *       500:
 *         description: Server error
 */
router.patch("/history/:friendId/delivered", async (req: Request, res: Response) => {
  try {
    const friendId = new Types.ObjectId(req.params.friendId);
    const { contentId, delivered } = req.body;
    await contentService.updateDeliveryStatus(friendId, contentId, delivered);
    res.sendStatus(200);
  } catch (error) {
    if (error instanceof Error && error.name === "CastError") {
      res.status(400).json({ error: "Invalid friend ID or content ID" });
      return;
    }
    logger.error("Failed to update delivery status:", error);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
});

export default router;
