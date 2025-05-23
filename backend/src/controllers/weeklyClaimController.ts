import { Request, Response } from "express";
import { errorResponse } from "../utils/utils";
import { prisma } from "../utils";
import { isUserMemberOfTeam } from "./wageController";
import { Prisma } from "@prisma/client";
import { WeeklyClaim } from "@prisma/client";
import { Address } from "viem";

type WeeklyClaimBodyRequest = {
  hoursWorked: number | string;
  hoursRated: number | string;
  teamId: number | string;
};

export const addWeeklyClaim = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const body = req.body as WeeklyClaimBodyRequest;

  const hoursWorked = Number(body.hoursWorked);
  const hoursRated = Number(body.hoursRated);
  const teamId = Number(body.teamId);

  const errors: string[] = [];

  if (!body.teamId) errors.push("Missing teamId");
  if (!body.hoursWorked) errors.push("Missing hoursWorked");
  if (!body.hoursRated) errors.push("Missing hoursRated");

  if (isNaN(teamId)) errors.push("Invalid teamId");
  if (isNaN(hoursWorked) || hoursWorked <= 0)
    errors.push("Invalid hoursWorked, must be a positive number");
  if (isNaN(hoursRated) || hoursRated <= 0)
    errors.push("Invalid hoursRated, must be a positive number");

  if (errors.length > 0) return errorResponse(400, errors.join(", "), res);

  try {
    const isMember = await isUserMemberOfTeam(callerAddress, teamId);
    if (!isMember) {
      return errorResponse(403, "User is not a member of the team", res);
    }

    const wage = await prisma.wage.findFirst({
      where: {
        userAddress: callerAddress,
        nextWageId: null,
        teamId: teamId,
      },
    });

    if (!wage) {
      return errorResponse(400, "No active wage found for the user in this team", res);
    }

    const weeklyClaim = await prisma.weeklyClaim.create({
      data: {
        hoursWorked,
        hoursRated,
        wageId: wage.id,
        status: "pending",
      },
    });

    return res.status(201).json(weeklyClaim);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Internal Server Error", res);
  } finally {
    await prisma.$disconnect();
  }
};

export const getWeeklyClaims = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const teamId = Number(req.query.teamId);
  const status = req.query.status as string;

  if (!teamId || isNaN(teamId)) {
    return errorResponse(400, "Missing or invalid teamId", res);
  }

  try {
    const isMember = await isUserMemberOfTeam(callerAddress, teamId);
    if (!isMember) {
      return errorResponse(403, "User is not a member of the team", res);
    }

    const wage = await prisma.wage.findFirst({
      where: {
        userAddress: callerAddress,
        teamId: teamId,
        nextWageId: null,
      },
    });

    if (!wage) {
      return errorResponse(400, "No active wage found for the user in this team", res);
    }

    const whereClause: Prisma.WeeklyClaimWhereInput = {
      wageId: wage.id,
    };

    if (status) {
      if (!["pending", "approved", "rejected"].includes(status)) {
        return errorResponse(400, "Invalid status value", res);
      }
      whereClause.status = status as any;
    }

    const weeklyClaims = await prisma.weeklyClaim.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(weeklyClaims);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Internal Server Error", res);
  } finally {
    await prisma.$disconnect();
  }
};
