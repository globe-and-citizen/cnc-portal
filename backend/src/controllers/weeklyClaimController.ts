import { Request, Response } from "express";
import { errorResponse } from "../utils/utils";
import { prisma } from "../utils";
import { Prisma, WeeklyClaim } from "@prisma/client";
import { isUserMemberOfTeam } from "./wageController";

// Define the WeeklyClaimBodyRequest type if not imported from elsewhere
type weeklyClaimBodyRequest = {
  hoursWorked: number | string;
  teamId: number | string;
  hoursRated: number | string;
};

export const addWeeklyClaim = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;

  const body = req.body as weeklyClaimBodyRequest;
  const hoursWorked = Number(body.hoursWorked);
  const teamId = Number(body.teamId);
  const hoursRated = Number(body.hoursRated);

  // Validating the claim data
  // Checking required data
  let parametersError: string[] = [];
  if (!body.teamId) parametersError.push("Missing teamId");
  if (!body.hoursWorked) parametersError.push("Missing hoursWorked");
  if (!body.hoursRated) parametersError.push("Missing hoursRated");
  if (isNaN(hoursWorked)) parametersError.push("Invalid hoursWorked");
  if (isNaN(hoursRated)) parametersError.push("Invalid hoursRated");
  if (hoursWorked <= 0)
    parametersError.push(
      "Invalid hoursWorked, hoursWorked must be greater than 0"
    );
  if (hoursRated <= 0)
    parametersError.push(
      "Invalid hoursRated, hoursRated must be greater than 0"
    );
  if (isNaN(teamId)) parametersError.push("Invalid teamId");
  if (parametersError.length > 0) {
    return errorResponse(400, parametersError.join(", "), res);
  }
  try {
    // Check if the user is a member of the team
    const isMember = await isUserMemberOfTeam(callerAddress, teamId);
    if (!isMember) {
      return errorResponse(403, "User is not a member of the team", res);
    }

    // Get the wage for the user in the team
    const wage = await prisma.wage.findFirst({
      where: { userAddress: callerAddress, nextWageId: null, teamId: teamId },
    });

    if (!wage) {
      return errorResponse(400, "No wage found for the user", res);
    }

    // Create the weekly claim
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
    return errorResponse(500, "Internal Server Error", res);
  } finally {
    await prisma.$disconnect();
  }
};
