// CRUD team using Prisma Client
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: Request, res: Response) => {
  const { name, members, description } = req.body;
  try {
    console.log(members);
    const team = await prisma.team.create({
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
  } catch (e) {
    console.log("Error: ", e);
    return res.status(500).json({ message: "Internal server error." });
  }
};
// Get Team
const getTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const team = await prisma.team.findUnique({
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
  } catch (e) {
    console.log("Error: ", e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get teams owned by user
const getAllTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        ownerId: req.body.address,
      },
    });
    res.status(200).json(teams);
  } catch (e) {
    console.log("Error: ", e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// update team
const updateTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const team = await prisma.team.update({
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
};

// Delete Team
const deleteTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const team = await prisma.team.delete({
    where: {
      id: Number(id),
    },
  });
  res.status(200).json(team);
};

//insert new members
const addMembers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const membersData = req.body;

  try {
    const membersToCreate = membersData.map(
      (member: { name: string; walletAddress: string }) => ({
        name: member.name,
        walletAddress: member.walletAddress,
        teamId: Number(id), // team ID
      })
    );

    const createdMembers = await prisma.member.createMany({
      data: membersToCreate,
    });

    res.status(201).json(createdMembers);
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//update member
const updateMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, walletAddress } = req.body;
  try {
    const member = await prisma.member.update({
      where: { id: Number(id) },
      data: {
        name: name,
        walletAddress: walletAddress,
      },
    });
    res.status(200).json(member);
  } catch (error) {
    console.log("Error updating", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//delete members
const deleteMembers = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const member = await prisma.member.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(member);
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  updateMember,
  deleteMembers,
  addMembers,
};
