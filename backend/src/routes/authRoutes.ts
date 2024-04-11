import express from "express";
import { authenticateSiwe } from "../controllers/authController";
const authRoutes = express.Router();

authRoutes.post("/siwe", authenticateSiwe);

export default authRoutes;
