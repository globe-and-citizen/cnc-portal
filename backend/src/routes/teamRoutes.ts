import express from "express";
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
} from "../controllers/teamController";
const teamRoutes = express.Router();

teamRoutes.post("/teams", addTeam);
teamRoutes.get("/teams", getAllTeams);
teamRoutes.post("/teams/:id", getTeam);
teamRoutes.put("/teams/:id", updateTeam);
teamRoutes.delete("/teams/:id", deleteTeam);

export default teamRoutes;
