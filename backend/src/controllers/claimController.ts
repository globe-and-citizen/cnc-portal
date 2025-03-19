import { Request, Response } from "express";

import { Address, isAddress } from "viem";
import { errorResponse } from "../utils/utils";
import { addNotification, prisma } from "../utils";
import { Prisma, Claim, User, Wage } from "@prisma/client";
import { isUserMemberOfTeam, isOwnerOfTeam } from "./wageController";

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
  } finally {
    await prisma.$disconnect();
  }
};

export const getClaims = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const teamId = Number(req.query.teamId);

  try {
    // Validate teamId
    if (isNaN(teamId)) {
      return errorResponse(400, "Invalid or missing teamId", res);
    }

    // Check if the user is a member of the provided team
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, "Caller is not a member of the team", res);
    }

    // Request all claims, that have a wage where the teamId is the provided teamId
    const claims = await prisma.claim.findMany({
      where: {
        wage: {
          teamId: teamId,
        },
      },
      include: {
        wage: {
          include: {
            user: {
              select: {
                address: true,
                name: true,
              },
            },
          },
        },
      },
    });
    return res.status(200).json(claims);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};

export const signeClaim = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const claimId = Number(req.params.id);
  const signature = req.body.signature as Claim["signature"];

  // Validating the claim data
  // Checking required data
  let parametersError: string[] = [];
  if (!signature) parametersError.push("Missing signature");

  try {
    // check if the callerAddress is the owner of the team
    const claim = await prisma.claim.findFirst({
      where: {
        id: claimId,
        wage: {
          team: {
            ownerAddress: callerAddress,
          },
        },
      },
    });
    if (!claim) {
      return errorResponse(403, "Caller is not the owner of the team", res);
    }

    // Update the claim status to signed
    const updatedClaim = await prisma.claim.update({
      where: {
        id: claimId,
      },
      data: {
        status: "signed",
        signature,
      },
    });
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};
