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
  getExpenseAccountData,
} from "../controllers/teamController";
import {
  addEmployeeWage,
  createClaim,
  updateClaim,
  getClaims,
  getMonthlyClaims,
} from "../controllers/cashRenumerationController";
const teamRoutes = express.Router();

teamRoutes.post("/", addTeam);
teamRoutes.get("/", getAllTeams);
teamRoutes.get("/:id", getTeam);
teamRoutes.put("/:id", updateTeam);
teamRoutes.delete("/:id", deleteTeam);
teamRoutes.delete("/:id/member", deleteMember);
teamRoutes.post("/:id/member", addMembers);
teamRoutes.post("/:id/expense-data", addExpenseAccountData);
teamRoutes.get("/:id/expense-data", getExpenseAccountData);

teamRoutes.post("/:id/cash-remunerations/wages", addEmployeeWage);

teamRoutes.get("/:id/cash-remunerations/claims", getClaims);
teamRoutes.get("/:id/cash-remunerations/monthly-claims", getMonthlyClaims);
teamRoutes.post("/:id/cash-remunerations/claims", createClaim);
teamRoutes.patch("/:id/cash-remuneration/claims/:id", updateClaim);

export default teamRoutes;
