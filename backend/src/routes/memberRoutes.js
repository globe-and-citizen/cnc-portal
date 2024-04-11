"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const memberController_1 = require("../controllers/memberController");
const express_1 = __importDefault(require("express"));
const memberRoutes = express_1.default.Router();
memberRoutes.delete("/member/:id", memberController_1.deleteMembers);
memberRoutes.put("/member/:id", memberController_1.updateMember);
memberRoutes.post("/member/:id", memberController_1.addMembers);
exports.default = memberRoutes;
