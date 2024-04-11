import express from "express";
import { createUser, getNonce } from "../controllers/userController";
const userRoutes = express.Router();

userRoutes.post("/create/:address", createUser);
userRoutes.get("/nonce/:address", getNonce);

export default userRoutes;
