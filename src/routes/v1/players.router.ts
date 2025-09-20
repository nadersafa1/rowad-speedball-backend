import express from "express";
import { playersController } from "../../controllers/players.controller";
import { requireAuth } from "../../middleware/better-auth";

const playersRouter = express.Router();

playersRouter.get("/players", playersController.findAll);
playersRouter.get("/players/:id", playersController.findById);
playersRouter.post("/players", requireAuth, playersController.create);
playersRouter.patch("/players/:id", requireAuth, playersController.update);
playersRouter.delete("/players/:id", requireAuth, playersController.delete);

export default playersRouter;
