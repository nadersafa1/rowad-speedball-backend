import express from "express";
import { playersController } from "../../controllers/players.controller";

const playersRouter = express.Router();

playersRouter.get("/players", playersController.findAll);

export default playersRouter;
