import { Prisma, PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
import { isAddress } from "ethers";
import { errorResponse } from "../utils/utils";
import { addNotification } from "../utils";

const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { name, members, description } = req.body;
  const callerAddress = (req as any).address;
  try {
    // Validate all members' wallet addresses
    for (const member of members) {
      if (!isAddress(member.address)) {
        throw new Error(`Invalid wallet address for member: ${member.name}`);
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
          },
        },
      },
    });

    if (!isUserPartOfTheTeam(team?.members ?? [], callerAddress)) {
      return errorResponse(403, "Unauthorized", res);
    }

    // Handle 404
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }

    if (!req.query) {
      res.status(200).json({ team, success: true });
    }

    const filterQuery = buildFilterMember(req.query);
    team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        members: {
          where: filterQuery,
          select: {
            address: true,
            name: true,
          },
        },
      },
    });
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
      // include: {
      //   members: {
      //     select: {
      //       address: true,
      //       name: true,
      //     },
      //   },
      // },
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
  const {
    name,
    description,
    bankAddress,
    votingAddress,
    boardOfDirectorsAddress,
    expenseAccountAddress,
    officerAddress,
  } = req.body;
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
    const teamU = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        bankAddress,
        votingAddress,
        boardOfDirectorsAddress,
        expenseAccountAddress,
        officerAddress,
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
    await prisma.boardOfDirectorActions.deleteMany({
      where: { teamId: Number(id) }
    })
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
  const callerAddress = (req as any).address;
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
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, "Unauthorized", res);
    }
    if (team.ownerAddress === memberAddress) {
      return errorResponse(401, "Owner cannot be removed", res);
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
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
      },
    });
    res.status(200).json({ success: true, team: updatedTeam });
  } catch (error: any) {
    // Handle errors
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
    return errorResponse(500, error.message || "Internal Server Error", res);
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
      {
        name: {
          contains: String(queryParams.query),
          mode: "insensitive",
        },
      },
      {
        address: {
          contains: String(queryParams.query),
          mode: "insensitive",
        },
      },
    ];
  }

  // can add others filter

  return filterQuery;
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
