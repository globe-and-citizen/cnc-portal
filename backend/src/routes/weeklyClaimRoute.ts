import express from "express";
import { addWeeklyClaim, getWeeklyClaims  } from "../controllers/weeklyClaimController";

const weeklyClaimRoutes = express.Router();

weeklyClaimRoutes.post("/", addWeeklyClaim);
weeklyClaimRoutes.get("/", getWeeklyClaims);

export default weeklyClaimRoutes;