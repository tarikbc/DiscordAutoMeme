import { Router, Request, Response } from "express";
import { WorkerManager } from "../../workers/WorkerManager";

const router = Router();
const workerManager = WorkerManager.getInstance();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Simple health check to verify API is running
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/status:
 *   get:
 *     summary: Get detailed system status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed system status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: System uptime in seconds
 *                 timestamp:
 *                   type: number
 *                   description: Current timestamp
 *                 workers:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total number of workers
 *                     active:
 *                       type: number
 *                       description: Number of active workers
 *                 memory:
 *                   type: object
 *                   properties:
 *                     heapTotal:
 *                       type: number
 *                       description: Total size of the heap
 *                     heapUsed:
 *                       type: number
 *                       description: Actual memory used
 *                     rss:
 *                       type: number
 *                       description: Resident set size
 *                     external:
 *                       type: number
 *                       description: Memory used by external resources
 */
router.get("/status", (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    workers: {
      total: workerManager.getWorkerCount(),
      active: workerManager.getActiveWorkerCount(),
    },
    memory: process.memoryUsage(),
  };

  res.json(status);
});

export default router;
