import express from "express";
import {
  getNonce,
  getUser,
  updateUser,
  searchUser,
  getAllUsers,
} from "../controllers/userController";
const userRoutes = express.Router();

userRoutes.get("/nonce/:address", getNonce);
userRoutes.get("/search", searchUser);
userRoutes.get("/", getAllUsers);
userRoutes.get("/:address", getUser);
userRoutes.put("/:address", updateUser);
export default userRoutes;
