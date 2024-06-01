import { PrismaClient } from "@prisma/client";
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
  console.log("Members:", members);
  try {
    // Validate all members' wallet addresses
    for (const member of members) {
      if (!isAddress(member.walletAddress)) {
        throw new Error(`Invalid wallet address for member: ${member.name}`);
      }
    }

    // Find the owner (user) by their address
    const ownerAddress = req.body.ownerAddress;
    const owner = await prisma.user.findUnique({
      where: {
        address: ownerAddress,
      },
    });

    if (!owner) {
      return errorResponse(404, "Owner not found", res);
    }

    // Ensure the owner's wallet address is in the members list
    if (!members.some((member: any) => member.walletAddress === ownerAddress)) {
      members.push({
        name: owner.name || "User",
        walletAddress: owner.address,
      });
    }

    // Create the team with the members connected
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerAddress,
        members: {
          connect: members.map((member: any) => ({
            address: member.walletAddress,
          })),
        },
      },
      include: {
        members: true,
      },
    });

    res.status(201).json({ success: true, team });
  } catch (error: any) {
    console.log("Error:", error);
    return errorResponse(500, error.message, res);
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

    // Handle 404
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== req.headers.owneraddress) {
      return errorResponse(401, "Unauthorized", res);
    }
    res.status(200).json({ team, success: true });
  } catch (error: any) {
    return errorResponse(500, error.message, res);
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
        ownerAddress: ownerId,
      },
      include: {
        members: true,
      },
    });
    res.status(200).json({ teams, success: true });
  } catch (error: any) {
    console.log("Error:", error);
    return errorResponse(500, error.message, res);
  }
};

// Update team
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
    return errorResponse(500, error.message, res);
  }
};

// Delete Team
const deleteTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  try {
    const team = await prisma.team.delete({
      where: {
        id: Number(id),
      },
    });
    res.status(200).json({ team, success: true });
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

export { addTeam, updateTeam, deleteTeam, getTeam, getAllTeams };
