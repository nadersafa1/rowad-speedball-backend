import express from "express";
import healthRouter from "./v1/health.router";
import playersRouter from "./v1/players.router";
import testsRouter from "./v1/tests.router";
import resultsRouter from "./v1/results.router";

const router = express.Router();

router.use("/api/v1", [
  healthRouter,
  playersRouter,
  testsRouter,
  resultsRouter,
]);

export default router;
