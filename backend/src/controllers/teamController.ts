import { Prisma, /*PrismaClient,*/ User } from "@prisma/client";
import { Request, Response } from "express";
import { isAddress } from "viem";
import { errorResponse } from "../utils/utils";
import { addNotification, prisma } from "../utils";
import publicClient from "../utils/viem.config";
import OFFICER_ABI from "../artifacts/officer_abi.json";
//const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { name, members, description, officerAddress } = req.body;
  const callerAddress = (req as any).address;
  try {
    // Validate all members' wallet addresses
    for (const member of members) {
      if (!isAddress(member.address)) {
        return errorResponse(400, `Invalid wallet address for member: ${member.name}`, res);
      } 
    }

    // Find the owner (user) by their address
    const owner = await prisma.user.findUnique({
      where: {
        address: String(callerAddress),
      },
    });

    if (!owner) {
      return errorResponse(404, "Owner not found", res);
    }

    // Ensure the owner's wallet address is in the members list
    if (!members.some((member: User) => member.address === callerAddress)) {
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
        ownerAddress: String(callerAddress),
        members: {
          connect: members.map((member: User) => ({
            address: member.address,
          })),
        },
        officerAddress: officerAddress,
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
      },
    });

    addNotification(
      members.map((member: User) => member.address),
      {
        message: `You have been added to a new team: ${name} by ${owner.name}`,
        subject: "Team Invitation",
        author: owner.address?.toString() || "",
        resource: `teams/${team.id}`,
      }
    );
    res.status(201).json(team);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};
// Get Team
const getTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const callerAddress = (req as any).address;
  try {
    let team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
            imageUrl: true,
          },
        },
        teamContracts: true,
      },
    });

    if (!isUserPartOfTheTeam(team?.members ?? [], callerAddress)) {
      return errorResponse(403, "Unauthorized", res);
    }

    // Handle 404
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    res.status(200).json(team);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

// Get teams owned by user
const getAllTeams = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const callerAddress = String((req as any).address);
  try {
    // Get teams owned by the user

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
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // Combine owned and member teams

    res.status(200).json(memberTeams);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

// Update team
const updateTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const { name, description, officerAddress, teamContract } = req.body;
  const callerAddress = (req as any).address;
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
      return errorResponse(403, "Unauthorized", res);
    }

    if (teamContract) {
      if (!isAddress(teamContract.address)) {
        return errorResponse(400, "Invalid contract address", res);
      }

      const existingContract = await prisma.teamContract.findUnique({
        where: {
          address: teamContract.address,
        },
      });

      if (existingContract) {
        //update the existing contract if found
        await prisma.teamContract.update({
          where: { address: teamContract.address },
          data: {
            type: teamContract.type,
            deployer: teamContract.deployer,
          },
        });
      } else {
        await prisma.teamContract.create({
          data: {
            address: teamContract.address,
            type: teamContract.type,
            deployer: teamContract.deployer,
            teamId: team.id,
          },
        });
      }
    }

    const teamU = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        officerAddress,
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
        teamContracts: true,
      },
    });
    res.status(200).json(teamU);
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
  const callerAddress = (req as any).address;
  try {
    const team = await prisma.team.findUnique({ where: { id: Number(id) } });
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, "Unauthorized", res);
    }
    await prisma.boardOfDirectorActions.deleteMany({
      where: { teamId: Number(id) },
    });

    await prisma.memberTeamsData.deleteMany({ where: { teamId: Number(id) } });

    await prisma.teamContract.deleteMany({ where: { teamId: Number(id) } });

    await prisma.claim.deleteMany({ where: { wage: { teamId: Number(id) } } });

    await prisma.wage.deleteMany({ where: { teamId: Number(id) } });

    await prisma.expense.deleteMany({ where: { teamId: Number(id) } });

    const teamD = await prisma.team.delete({ where: { id: Number(id) } });

    res.status(200).json({ team: teamD, success: true });
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

const isUserPartOfTheTeam = async (
  members: { address: string; name?: string | null }[],
  callerAddress: string
) => {
  return members.some((member) => member.address === callerAddress);
};

const buildFilterMember = (queryParams: Request["query"]) => {
  const filterQuery: Prisma.UserWhereInput = {};
  if (queryParams.query) {
    filterQuery.OR = [
      { name: { contains: String(queryParams.query), mode: "insensitive" } },
      { address: { contains: String(queryParams.query), mode: "insensitive" } },
    ];
  }

  // can add others filter

  return filterQuery;
};

export { addTeam, updateTeam, deleteTeam, getTeam, getAllTeams };
