import express from "express";
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  addExpenseAccountData,
  getExpenseAccountData,
  // addClaim,
  // approveClaim,
  // deleteClaim,
  // updateClaim,
  // getClaims,
  // getClaim,
  // addContracts,
} from "../controllers/teamController";
import { getContracts, syncContracts } from "../controllers/ContractController";

import { deleteMember, addMembers } from "../controllers/memberController";
const teamRoutes = express.Router();

// Team CRUD routes
teamRoutes.post("/", addTeam);
teamRoutes.get("/", getAllTeams);
teamRoutes.get("/:id", getTeam);
teamRoutes.put("/:id", updateTeam);
teamRoutes.delete("/:id", deleteTeam);

// Team Members CRUD routes
teamRoutes.post("/:id/member", addMembers);
teamRoutes.delete("/:id/member/:memberAddress", deleteMember);

teamRoutes.post("/:id/expense-data", addExpenseAccountData);
teamRoutes.get("/:id/expense-data", getExpenseAccountData);
// teamRoutes.post("/:id/cash-remuneration/claim", addClaim);
// teamRoutes.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
// // teamRoutes.put("/:id/cash-remuneration/claim/approve", approveClaim)
// teamRoutes.delete("/:id/cash-remuneration/claim", deleteClaim);
// teamRoutes.get("/:id/cash-remuneration/claim/:status", getClaims);
// teamRoutes.get("/:id/cash-remuneration/claim", getClaim);

// teamRoutes.post("/:id/add-contracts", addContracts);
teamRoutes.get("/contract/get", getContracts);

teamRoutes.put("/contract/sync", syncContracts);

export default teamRoutes;
