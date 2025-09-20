import express from "express";
import { playersController } from "../../controllers/players.controller";

const chatRouter = express.Router();

chatRouter.get("/players", playersController.findAll);

export default chatRouter;
