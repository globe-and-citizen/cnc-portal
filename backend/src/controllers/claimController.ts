import { Request, Response } from "express";

import { Address, isAddress } from "viem";
import { errorResponse } from "../utils/utils";
import { addNotification, prisma } from "../utils";
import { Prisma, Claim, User, Wage } from "@prisma/client";

type claimBodyRequest = Pick<Claim, "hoursWorked"> & { teamId: string };
export const addClaim = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;

  const body = req.body as claimBodyRequest;
  const hoursWorked = Number(body.hoursWorked);
  const teamId = Number(body.teamId);

  // Validating the claim data
  // Checking required data
  let parametersError: string[] = [];
  if (!body.teamId) parametersError.push("Missing teamId");
  if (!body.hoursWorked) parametersError.push("Missing hoursWorked");
  if (isNaN(hoursWorked)) parametersError.push("Invalid hoursWorked");
  if (isNaN(teamId)) parametersError.push("Invalid teamId");
  if (hoursWorked <= 0)
    parametersError.push(
      "Invalid hoursWorked, hoursWorked must be greater than 0"
    );
  if (parametersError.length > 0) {
    return errorResponse(400, parametersError.join(", "), res);
  }

  try {
    // Get user current
    const wage = await prisma.wage.findFirst({
      where: { userAddress: callerAddress, nextWageId: null, teamId: teamId },
    });

    if (!wage) {
      return errorResponse(400, "No wage found for the user", res);
    }
    const claim = await prisma.claim.create({
      data: {
        hoursWorked,
        wageId: wage.id,
        status: "pending",
      },
    });

    return res.status(201).json(claim);
  } catch (error) {
    return errorResponse(500, "Internal Server Error", res);
  }
};
