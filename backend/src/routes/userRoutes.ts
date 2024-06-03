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
userRoutes.get("/:address", getUser);
userRoutes.put("/:address", updateUser);
userRoutes.get("/search/user", searchUser);
userRoutes.get("/search/getAllUsers", getAllUsers);
export default userRoutes;
