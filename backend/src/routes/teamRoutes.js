"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teamController_1 = require("../controllers/teamController");
const teamRoutes = express_1.default.Router();
teamRoutes.post("/teams", teamController_1.addTeam);
teamRoutes.get("/teams", teamController_1.getAllTeams);
teamRoutes.post("/teams/:id", teamController_1.getTeam);
teamRoutes.put("/teams/:id", teamController_1.updateTeam);
teamRoutes.delete("/teams/:id", teamController_1.deleteTeam);
exports.default = teamRoutes;
