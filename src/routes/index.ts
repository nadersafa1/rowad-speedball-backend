import express from "express";
import healthRouter from "./v1/health.router";
import playersRouter from "./v1/players.router";
import testsRouter from "./v1/tests.router";

const router = express.Router();

router.use("/api/v1", [healthRouter, playersRouter, testsRouter]);

export default router;
