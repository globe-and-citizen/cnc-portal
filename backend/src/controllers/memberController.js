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
exports.addMembers = exports.deleteMembers = exports.updateMember = void 0;
// CRUD Members using Prisma Client
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
//insert new members
const addMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const membersData = req.body;
    try {
        const membersToCreate = membersData.map((member) => ({
            name: member.name,
            walletAddress: member.walletAddress,
            teamId: Number(id), // team ID
        }));
        const createdMembers = yield prisma.member.createMany({
            data: membersToCreate,
        });
        res.status(201).json(createdMembers);
    }
    catch (error) {
        console.error("Error adding members:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.addMembers = addMembers;
//update member
const updateMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, walletAddress } = req.body;
    try {
        const member = yield prisma.member.update({
            where: { id: Number(id) },
            data: {
                name: name,
                walletAddress: walletAddress,
            },
        });
        res.status(200).json(member);
    }
    catch (error) {
        console.log("Error updating", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.updateMember = updateMember;
//delete members
const deleteMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const member = yield prisma.member.delete({
            where: { id: Number(id) },
        });
        res.status(200).json(member);
    }
    catch (error) {
        console.error("Error deleting member:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.deleteMembers = deleteMembers;
