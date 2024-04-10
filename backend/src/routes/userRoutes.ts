import express from "express";
import {
    createUser
} from "../controllers/userController";
const userRoutes = express.Router();

userRoutes.post("/create", createUser);
/*teamRoutes.get("/teams", getAllTeams);
teamRoutes.post("/teams/:id", getTeam);
teamRoutes.put("/teams/:id", updateTeam);
teamRoutes.delete("/teams/:id", deleteTeam);*/

export default userRoutes;
