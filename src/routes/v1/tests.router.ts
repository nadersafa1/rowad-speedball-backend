import express from "express";
import { testsController } from "../../controllers/tests.controller";

const testsRouter = express.Router();

testsRouter.get("/tests", testsController.findAll);
testsRouter.get("/tests/:id", testsController.findById);
testsRouter.post("/tests", testsController.create);
testsRouter.patch("/tests/:id", testsController.update);
testsRouter.delete("/tests/:id", testsController.delete);

export default testsRouter;
