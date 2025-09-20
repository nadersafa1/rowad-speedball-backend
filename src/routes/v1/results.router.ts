import express from "express";
import { resultsController } from "../../controllers/results.controller";
import { requireAuth } from "../../middleware/better-auth";

const resultsRouter = express.Router();

resultsRouter.get("/results", resultsController.findAll);
resultsRouter.get("/results/:id", resultsController.findById);
resultsRouter.post("/results", requireAuth, resultsController.create);
resultsRouter.post("/results/bulk", requireAuth, resultsController.createBulk);
resultsRouter.patch("/results/:id", requireAuth, resultsController.update);
resultsRouter.delete("/results/:id", requireAuth, resultsController.delete);

export default resultsRouter;
