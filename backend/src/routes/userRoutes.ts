import express from "express";
import { getNonce, getUser, updateUser } from "../controllers/userController";
const userRoutes = express.Router();

userRoutes.get("/nonce/:address", getNonce);
userRoutes.get("/:address", getUser);
userRoutes.put("/:address", updateUser);
export default userRoutes;
