import express from "express";
import healthRouter from "./v1/health.router";
import playersRouter from "./v1/players.router";

const router = express.Router();

router.use("/api/v1", [healthRouter, playersRouter]);

export default router;
