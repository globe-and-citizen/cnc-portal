import express from "express";
import {  getTeamWeeklyClaims  } from "../controllers/weeklyClaimController";

const weeklyClaimRoutes = express.Router();

weeklyClaimRoutes.get("/", getTeamWeeklyClaims);

export default weeklyClaimRoutes;