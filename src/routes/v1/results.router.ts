import express from "express";
import { resultsController } from "../../controllers/results.controller";

const resultsRouter = express.Router();

resultsRouter.get("/results", resultsController.findAll);
resultsRouter.get("/results/:id", resultsController.findById);
resultsRouter.post("/results", resultsController.create);
resultsRouter.post("/results/bulk", resultsController.createBulk);
resultsRouter.patch("/results/:id", resultsController.update);
resultsRouter.delete("/results/:id", resultsController.delete);

export default resultsRouter;
