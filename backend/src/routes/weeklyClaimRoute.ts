import express from "express";
import { getTeamWeeklyClaims, updateWeeklyClaims } from "../controllers/weeklyClaimController";

const weeklyClaimRoutes = express.Router();

weeklyClaimRoutes.get("/", getTeamWeeklyClaims);
weeklyClaimRoutes.put("/:claimId", updateWeeklyClaims)

export default weeklyClaimRoutes;
