import {
  updateMember,
  deleteMembers,
  addMembers,
} from "../controllers/memberController";
import express from "express";
const memberRoutes = express.Router();

memberRoutes.delete("/:id", deleteMembers);
memberRoutes.put("/:id", updateMember);
memberRoutes.post("/:id", addMembers);

export default memberRoutes;
