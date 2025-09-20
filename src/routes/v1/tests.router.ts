import express from "express";
import { testsController } from "../../controllers/tests.controller";
import { requireAuth } from "../../middleware/better-auth";

const testsRouter = express.Router();

testsRouter.get("/tests", testsController.findAll);
testsRouter.get("/tests/:id", testsController.findById);
testsRouter.post("/tests", requireAuth, testsController.create);
testsRouter.patch("/tests/:id", requireAuth, testsController.update);
testsRouter.delete("/tests/:id", requireAuth, testsController.delete);

export default testsRouter;
