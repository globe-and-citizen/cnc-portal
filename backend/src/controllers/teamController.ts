// CRUD team using Prisma Client
import { Member, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { isWalletAddressValid } from "../utils/validators/walletValidatorUtil";

const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Teams']
  */
  const { name, members, description } = req.body;
  console.log("Members:", members.createMany.data);
  try {
    members.createMany.data.map((member: Member) => {
      if (!isWalletAddressValid(member.walletAddress)) {
        throw new Error(`Invalid wallet address for member: ${member.name}`);
      }
    });

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
  } catch (e: any) {
    console.log("Error: ", e);
    res.status(500).json({ error: `${e.message}` });
  }
};
// Get Team
const getTeam = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Teams']
  */
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
    if (team.ownerId !== req.headers.owneraddress) {
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
  /* 
  #swagger.tags = ['Teams']
  */
  const ownerId = String(req.headers.owneraddress);
  try {
    const teams = await prisma.team.findMany({
      where: {
        ownerId: ownerId,
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
  /* 
  #swagger.tags = ['Teams']
  */
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
  /* 
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const team = await prisma.team.deleteMany({
    where: {
      id: Number(id),
    },
  });
  res.status(200).json(team);
};

export { addTeam, updateTeam, deleteTeam, getTeam, getAllTeams };
