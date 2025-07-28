import express from "express";
import { getTeamWeeklyClaims, updateWeeklyClaims } from "../controllers/weeklyClaimController";

const weeklyClaimRoutes = express.Router();

weeklyClaimRoutes.get("/", getTeamWeeklyClaims);
weeklyClaimRoutes.put("/:id", updateWeeklyClaims)

export default weeklyClaimRoutes;
