import express from "express";
import { verifySiwe } from "../controllers/authController";
const authRoutes = express.Router();

authRoutes.post("/siwe", verifySiwe);

export default authRoutes;
