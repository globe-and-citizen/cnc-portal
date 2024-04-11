"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTeams = exports.getTeam = exports.deleteTeam = exports.updateTeam = exports.addTeam = void 0;
// CRUD team using Prisma Client
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Create a new team
const addTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, members, description } = req.body;
    try {
        console.log(members);
        const team = yield prisma.team.create({
            data: {
                name,
                members,
                description,
                ownerId: req.body.address,
            },
            include: {
                members: true,
            },
        });
        console.log(team);
        res.status(201).json(team);
    }
    catch (e) {
        console.log("Error: ", e);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.addTeam = addTeam;
// Get Team
const getTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const team = yield prisma.team.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                members: true,
            },
        });
        // Handle  404
        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }
        if (team.ownerId !== req.body.address) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        res.status(200).json(team);
    }
    catch (e) {
        console.log("Error: ", e);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.getTeam = getTeam;
// Get teams owned by user
const getAllTeams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teams = yield prisma.team.findMany({
            where: {
                ownerId: req.body.address,
            },
        });
        res.status(200).json(teams);
    }
    catch (e) {
        console.log("Error: ", e);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.getAllTeams = getAllTeams;
// update team
const updateTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description } = req.body;
    const team = yield prisma.team.update({
        where: { id: Number(id) },
        data: {
            name,
            description,
        },
        include: {
            members: true,
        },
    });
    res.status(200).json(team);
});
exports.updateTeam = updateTeam;
// Delete Team
const deleteTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const team = yield prisma.team.delete({
        where: {
            id: Number(id),
        },
    });
    res.status(200).json(team);
});
exports.deleteTeam = deleteTeam;
