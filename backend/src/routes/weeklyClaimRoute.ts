import express from "express";
import { getTeamWeeklyClaims } from "../controllers/weeklyClaimController";

const weeklyClaimRoutes = express.Router();

weeklyClaimRoutes.get("/team", getTeamWeeklyClaims);

export default weeklyClaimRoutes;
