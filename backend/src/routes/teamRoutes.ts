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
  addEmployeeWage,
  addClaim,
  // approveClaim,
  deleteClaim,
  updateClaim,
  getClaims,
  getClaim,
  addContracts,
} from "../controllers/teamController";
const teamRoutes = express.Router();

teamRoutes.post("/", addTeam);
teamRoutes.get("/", getAllTeams);
teamRoutes.get("/:id", getTeam);
teamRoutes.put("/:id", updateTeam);
teamRoutes.delete("/:id", deleteTeam);

teamRoutes.delete("/:id/member", deleteMember);
teamRoutes.post("/:id/member", addMembers);
teamRoutes.put("/:id/member/:memberAddress/setWage", addEmployeeWage);

teamRoutes.post("/:id/expense-data", addExpenseAccountData);
teamRoutes.get("/:id/expense-data", getExpenseAccountData);
teamRoutes.post("/:id/cash-remuneration/claim", addClaim);
teamRoutes.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
// teamRoutes.put("/:id/cash-remuneration/claim/approve", approveClaim)
teamRoutes.delete("/:id/cash-remuneration/claim", deleteClaim);
teamRoutes.get("/:id/cash-remuneration/claim/:status", getClaims);
teamRoutes.get("/:id/cash-remuneration/claim", getClaim);

teamRoutes.post("/:id/add-contracts", addContracts);

export default teamRoutes;
