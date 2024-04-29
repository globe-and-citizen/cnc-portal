import express from "express";
import { getNonce, getUser } from "../controllers/userController";
const userRoutes = express.Router();

userRoutes.get("/nonce/:address", getNonce);
userRoutes.get("/:address", getUser);
export default userRoutes;
