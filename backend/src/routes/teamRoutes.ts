import express from "express";
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  deleteMember,
  addMembers,
  addExpenseAccountData,
  getExpenseAccountData
} from "../controllers/teamController";
const teamRoutes = express.Router();

teamRoutes.post("/", addTeam);
teamRoutes.get("/", getAllTeams);
teamRoutes.get("/:id", getTeam);
teamRoutes.put("/:id", updateTeam);
teamRoutes.delete("/:id", deleteTeam);
teamRoutes.delete("/:id/member", deleteMember);
teamRoutes.post("/:id/member", addMembers);
teamRoutes.post("/:id/member/add-expense-data", addExpenseAccountData);
teamRoutes.get("/:id/member", getExpenseAccountData)

export default teamRoutes;
