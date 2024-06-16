import express from "express";
import {
  getNonce,
  getUser,
  updateUser,
  searchUser,
  getAllUsers,
} from "../controllers/userController";
import { authorizeUser } from "../middleware/authMiddleware";
const userRoutes = express.Router();

userRoutes.get("/nonce/:address", getNonce);
userRoutes.get("/search", authorizeUser, searchUser);
userRoutes.get("/", authorizeUser, getAllUsers);
userRoutes.get("/:address", authorizeUser, getUser);
userRoutes.put("/:address", authorizeUser, updateUser);
export default userRoutes;
