import { PrismaClient, User } from "@prisma/client";
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
      if (!isAddress(member.address)) {
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
    if (!members.some((member: User) => member.address === ownerAddress)) {
      members.push({
        name: owner.name || "User",
        address: owner.address,
      });
    }

    // Create the team with the members connected
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerAddress,
        members: {
          connect: members.map((member: User) => ({
            address: member.address,
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
  const callerAddress = req.headers.calleraddress;
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
    const teamMembers = team.members.map((member) => member.address);
    if (teamMembers.includes(String(callerAddress)) === false) {
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
  const callerAddress = String(req.headers.calleraddress);
  try {
    // Get teams owned by the user
    const ownedTeams = await prisma.team.findMany({
      where: {
        ownerAddress: callerAddress,
      },
      include: {
        members: true,
      },
    });

    // Get teams where the user is a member
    const memberTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            address: callerAddress,
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Combine owned and member teams
    const allTeams = [...ownedTeams, ...memberTeams];

    // Filter out duplicate teams
    const uniqueTeams = allTeams.filter(
      (team, index, self) => index === self.findIndex((t) => t.id === team.id)
    );

    res.status(200).json({ teams: uniqueTeams, success: true });
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
  const callerAddress = req.headers.calleraddress;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(401, "Unauthorized", res);
    }
    const teamU = await prisma.team.update({
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
    res.status(200).json({ team: teamU, success: true });
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
  const callerAddress = req.headers.calleraddress;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(401, "Unauthorized", res);
    }
    const teamD = await prisma.team.delete({
      where: {
        id: Number(id),
      },
    });

    res.status(200).json({ team: teamD, success: true });
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

const deleteMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const memberAddress = req.headers.memberaddress;

  try {
    // Find the team
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    // Check if the team exists
    if (!team) {
      throw new Error("Team not found");
    }

    // Find the index of the member in the team
    const memberIndex = team.members.findIndex(
      (member) => member.address === memberAddress
    );

    // If member not found in the team, throw an error
    if (memberIndex === -1) {
      throw new Error("Member not found in the team");
    }

    // Update the team to disconnect the specified member
    const name = team.name;
    const description = team.description;

    const updatedTeam = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        members: {
          disconnect: { address: String(memberAddress) },
        },
      },
    });
    console.log("Updated Team:", updatedTeam);
    res.status(200).json({ success: true, team: updatedTeam });
  } catch (error: any) {
    // Handle errors
    console.log("Error:", error);
    return errorResponse(500, error.message || "Internal Server Error", res);
  }
};
const addMembers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const membersData = req.body.data;

  try {
    // Fetch the team and its current members
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    await prisma.team.update({
      where: { id: Number(id) },
      data: {
        members: {
          connect: membersData.map((member: User) => ({
            address: member.address,
          })),
        },
      },
    });

    // Fetch all members of the team after addition
    const updatedTeam = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    // Return the updated members list
    return res
      .status(201)
      .json({ members: updatedTeam?.members, success: true });
  } catch (error: any) {
    console.log("Error:", error);
    return errorResponse(500, error.message || "Internal Server Error", res);
  }
};

export {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  deleteMember,
  addMembers,
};
