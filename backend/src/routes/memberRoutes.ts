import {
  updateMember,
  deleteMembers,
  addMembers,
} from "../controllers/memberController";
import express from "express";
const memberRoutes = express.Router();

memberRoutes.delete("/member/:id", deleteMembers);
memberRoutes.put("/member/:id", updateMember);
memberRoutes.post("/member/:id", addMembers);

export default memberRoutes;
