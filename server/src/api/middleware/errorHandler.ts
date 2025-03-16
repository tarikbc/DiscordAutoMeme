import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import logger from "../../utils/logger";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
