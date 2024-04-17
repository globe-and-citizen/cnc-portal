import express from "express";
import { getNonce } from "../controllers/userController";
const userRoutes = express.Router();

userRoutes.get("/nonce/:address", getNonce);

export default userRoutes;
