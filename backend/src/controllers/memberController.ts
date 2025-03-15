import { Request, Response } from "express";

import { Address, isAddress } from "viem";
import { errorResponse } from "../utils/utils";
import { addNotification, prisma } from "../utils";
import { Prisma, User } from "@prisma/client";

export const deleteMember = async (req: Request, res: Response) => {
  const { id, memberAddress } = req.params;
  const callerAddress = (req as any).address;
  try {
    // Find the team
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    // Check if the team exists
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(
        403,
        "Unauthorized: Only the owner can delete a member",
        res
      );
    }
    if (team.ownerAddress === memberAddress) {
      return errorResponse(
        403,
        "Unauthorized: The Owner cannot be removed",
        res
      );
    }

    // Find the index of the member in the team
    const memberIndex = team.members.findIndex(
      (member) => member.address === memberAddress
    );

    // If member not found in the team, throw an error
    if (memberIndex === -1) {
      return errorResponse(404, "Member not found in the team", res);
    }

    // Update the team to disconnect the specified member
    const name = team.name;
    const description = team.description;

    await prisma.memberTeamsData.delete({
      where: {
        userAddress_teamId: {
          userAddress: String(memberAddress),
          teamId: Number(id),
        },
      },
    });

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

export const addMembers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const membersData = req.body as Array<Pick<User, "address">>;

  // Check if the data is valid
  if (
    !Array.isArray(membersData) ||
    membersData.length === 0 ||
    !membersData.every((member) => isAddress(member.address))
  ) {
    return res.status(400).json({
      message: "Bad Request: Members data is not well formated",
    });
  }
  try {
    // Fetch the team and its current members
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const callerAddress = (req as any).address;
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(
        403,
        "Unauthorized: Only the owner can Add a member",
        res
      );
    }

    // List of members in membersData that already exist in the team.members
    const existingMembers = membersData.filter((member) =>
      team.members.some((m) => m.address === member.address)
    );

    if (existingMembers.length > 0) {
      return res.status(400).json({
        message: `Members ${existingMembers.map(
          (member) => member.address
        )} already in the team`,
      });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        members: {
          connect: membersData.map((member) => ({
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

    // Return the updated members list
    return res.status(201).json({ members: updatedTeam?.members });
  } catch (error: any) {
    return errorResponse(500, error.message || "Internal Server Error", res);
  }
};

export const setEmployeeWage = async (req: Request, res: Response) => {
  const { id, memberAddress } = req.params;

  const callerAddress = (req as any).address;
  // const memberAddress = req.headers.memberaddress;
  const wageData = req.body;

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
    });
    const ownerAddress = team?.ownerAddress;
    if (callerAddress !== ownerAddress) {
      return errorResponse(
        403,
        "Unauthorized: Only the owner can set the wage",
        res
      );
    }
    if (!isAddress(memberAddress)) {
      return errorResponse(400, "Bad Request: MemberAddress is not valid", res);
    }
    // Check for missing fields
    // Check for hourlyRate
    if (!wageData.hourlyRate) {
      return errorResponse(400, "Bad Request: Missing hourly Rate", res);
    }
    // Check for maxHoursPerWeek
    if (!wageData.maxWeeklyHours) {
      return errorResponse(400, "Bad Request: Missing max weekly hours", res);
    }

    // Check if wageData.hourlyRate & wageData.maxHoursPerWeek are numbers
    if (
      isNaN(Number(wageData.hourlyRate)) ||
      isNaN(Number(wageData.maxWeeklyHours))
    ) {
      return errorResponse(
        400,
        "Bad Request: One of the wage data is not a number",
        res
      );
    }

    //create or update wage data
    await prisma.memberTeamsData.upsert({
      where: {
        userAddress_teamId: {
          userAddress: memberAddress,
          teamId: Number(id),
        },
      },
      update: {
        hourlyRate: wageData.hourlyRate,
        maxHoursPerWeek: wageData.maxHoursPerWeek,
      },
      create: {
        userAddress: memberAddress,
        teamId: Number(id),
        hourlyRate: wageData.hourlyRate,
        maxHoursPerWeek: wageData.maxHoursPerWeek,
      },
    });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};
