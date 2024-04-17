import express from "express";
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
} from "../controllers/teamController";
import { authorizeUser } from "../middleware/authMiddleware";
const teamRoutes = express.Router();

teamRoutes.post("/", authorizeUser, addTeam);
teamRoutes.get("/", authorizeUser, getAllTeams);
teamRoutes.post("/:id", authorizeUser, getTeam);
teamRoutes.put("/:id", authorizeUser, updateTeam);
teamRoutes.delete("/:id", authorizeUser, deleteTeam);

export default teamRoutes;
