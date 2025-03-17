import express from "express";
import { setWage } from "../controllers/wageController";

const wageRoutes = express.Router();
wageRoutes.put("/setWage", setWage);

export default wageRoutes;