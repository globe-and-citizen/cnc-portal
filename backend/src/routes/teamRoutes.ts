import express from "express";
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  deleteMember,
  addMembers,
  addMemberRoles,
  getMemberContract,
  addMemberSignature
} from "../controllers/teamController";
const teamRoutes = express.Router();

teamRoutes.post("/", addTeam);
teamRoutes.get("/", getAllTeams);
teamRoutes.get("/:id", getTeam);
teamRoutes.put("/:id", updateTeam);
teamRoutes.delete("/:id", deleteTeam);
teamRoutes.delete("/:id/member", deleteMember);
teamRoutes.post("/:id/member", addMembers);
teamRoutes.post("/:id/member/add-roles", addMemberRoles)
teamRoutes.get("/:id/member/contract", getMemberContract)
teamRoutes.put("/:id/member/signature/:signature", addMemberSignature)

export default teamRoutes;
