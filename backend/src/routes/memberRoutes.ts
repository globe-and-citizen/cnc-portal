import {
  updateMember,
  deleteMembers,
  addMembers,
} from "../controllers/memberController";
import express from "express";
import { authorizeUser } from "../middleware/authMiddleware";
const memberRoutes = express.Router();

memberRoutes.delete("/:id", authorizeUser, deleteMembers);
memberRoutes.put("/:id", authorizeUser, updateMember);
memberRoutes.post("/:id", authorizeUser, addMembers);

export default memberRoutes;
