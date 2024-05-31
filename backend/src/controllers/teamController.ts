// CRUD team using Prisma Client
import { Member, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { isAddress } from "ethers";
import { errorResponse } from "../utils/utils";

const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Teams']
  */
  const { name, members, description } = req.body;
  console.log("Members:", members.createMany.data);
  try {
    for (const member of members.createMany.data) {
      if (!isAddress(member.walletAddress)) {
        throw new Error(`Invalid wallet address for member: ${member.name}`);
      }
    }
    const user = await prisma.user.findUnique({
      where: {
        address: req.body.address,
      },
    });
    if (!user) {
      return errorResponse(404, "User not found", res);
    }
    members.createMany.data.push({
      name: user.name ? user.name : "User",
      walletAddress: user.address,
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
    res.status(201).json({ success: true, team });
  } catch (error: any) {
    console.log("Error:", error);
    return errorResponse(500, error, res);
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
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerId !== req.headers.owneraddress) {
      return errorResponse(401, "Unauthorized", res);
    }
    res.status(200).json({ team, success: true });
  } catch (error) {
    return errorResponse(500, error, res);
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
    res.status(200).json({ teams, success: true });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// update team
const updateTeam = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const { name, description, bankAddress } = req.body;
  try {
    const team = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        bankAddress,
      },
      include: {
        members: true,
      },
    });
    res.status(200).json({ team, success: true });
  } catch (error: any) {
    return errorResponse(500, error, res);
  }
};

// Delete Team
const deleteTeam = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  try {
    const team = await prisma.team.deleteMany({
      where: {
        id: Number(id),
      },
    });
    res.status(200).json({ team, success: true });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export { addTeam, updateTeam, deleteTeam, getTeam, getAllTeams };
