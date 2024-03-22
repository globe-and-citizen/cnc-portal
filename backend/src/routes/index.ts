import express from "express";
import { generateNonce } from "siwe";

import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  updateMember,
  deleteMembers,
  addMembers,
} from "../controllers/teamController";

const router = express.Router();

// Team Controller
router.post("/teams", addTeam);
router.get("/teams", getAllTeams);
router.post("/teams/:id", getTeam);
router.put("/teams/:id", updateTeam);
router.delete("/teams/:id", deleteTeam);
router.delete("/member/:id", deleteMembers);
router.put("/member/:id", updateMember);
router.post("/member/:id", addMembers);

export default router;
