import express from "express";
import { playersController } from "../../controllers/players.controller";

const playersRouter = express.Router();

playersRouter.get("/players", playersController.findAll);
playersRouter.get("/players/:id", playersController.findById);
playersRouter.post("/players", playersController.create);
playersRouter.patch("/players/:id", playersController.update);
playersRouter.delete("/players/:id", playersController.delete);

export default playersRouter;
