import { sql } from "drizzle-orm";
import express from "express";

import type { Request, Response } from "express";
import { db } from "../../db/connection";

const healthRouter = express.Router();

healthRouter.get("/health", async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default healthRouter;
