import { Request, Response } from "express";

import { Address } from "viem";
import { errorResponse } from "../utils/utils";
import { prisma } from "../utils";
import { Wage } from "@prisma/client";

type wageBodyRequest = Pick<
  Wage,
  | "teamId"
  | "userAddress"
  | "cashRatePerHour"
  | "tokenRatePerHour"
  | "maximumHoursPerWeek"
  | "usdcRatePerHour"
>;
export const setWage = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;

  const body = req.body as wageBodyRequest;
  const teamId = Number(body.teamId);
  const userAddress = body.userAddress as Address;
  const cashRatePerHour = Number(body.cashRatePerHour);
  const tokenRatePerHour = Number(body.tokenRatePerHour);
  const maximumHoursPerWeek = Number(body.maximumHoursPerWeek);
  const usdcRatePerHour = Number(body.usdcRatePerHour);

  // Validating the wage data
  // Checking required data

  let missingParameters = [];
  if (isNaN(teamId)) missingParameters.push("teamId");
  if (!userAddress) missingParameters.push("userAddress");
  if (isNaN(cashRatePerHour)) missingParameters.push("cashRatePerHour");
  if (isNaN(tokenRatePerHour)) missingParameters.push("tokenRatePerHour");
  if (isNaN(maximumHoursPerWeek)) missingParameters.push("maximumHoursPerWeek");

  // Checking if the parameters are empty
  if (missingParameters.length > 0) {
    return errorResponse(
      400,
      `Missing or invalid parameters: ${missingParameters.join(", ")}`,
      res
    );
  }

  // Checking if maximumHoursPerWeek is a number, is an integer and is greater than 0
  let errors = [];

  if (!Number.isInteger(maximumHoursPerWeek) || maximumHoursPerWeek <= 0) {
    errors.push("Invalid maximumHoursPerWeek");
  }

  if (cashRatePerHour <= 0) {
    errors.push("Invalid cashRatePerHour");
  }

  if (errors.length > 0) {
    return errorResponse(400, `Errors: ${errors.join(", ")}`, res);
  }

  try {
    // Check if the caller is the owner of the team
    if (!(await isOwnerOfTeam(callerAddress, teamId))) {
      return errorResponse(403, "Caller is not the owner of the team", res);
    }

    // Check if the user has a current wage
    const wage = await prisma.wage.findFirst({
      where: {
        teamId: teamId,
        userAddress,
        nextWageId: null,
      },
    });

    if (wage) {
      // Create wage and chain it to the previous wage
      await prisma.wage.create({
        data: {
          teamId: Number(teamId),
          userAddress,
          cashRatePerHour,
          tokenRatePerHour,
          maximumHoursPerWeek,
          usdcRatePerHour,
          previousWage: {
            connect: {
              id: wage.id,
            },
          },
        },
      });

      res.status(201).json(wage);
    } else {
      // check if the user has wage not chained
      const wages = await prisma.wage.findMany({
        where: {
          teamId: Number(teamId),
          userAddress,
        },
      });

      // This should not be possible, but if it is, return an error
      if (wages.length > 0) {
        return errorResponse(500, "User has a wage not chained", res);
      }

      // Create first wage
      const createdWage = await prisma.wage.create({
        data: {
          teamId: Number(teamId),
          userAddress,
          cashRatePerHour,
          tokenRatePerHour,
          maximumHoursPerWeek,
          usdcRatePerHour
        },
      });
      res.status(201).json(createdWage);
    }
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};
// /wage/?teamId=teamId
export const getWages = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const teamId = Number(req.query.teamId);

  // find the team and check if the caller is the owner
  // TODO: in the future only the owner should be able to see the wages

  // Find user wages
  try {
    // check if the member is part of the provided team
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, "Member is not a team member", res);
    }
    const wages = await prisma.wage.findMany({
      where: {
        teamId: teamId,
        nextWageId: null,
      },
      include: {
        previousWage: {
          select: {
            id: true,
          },
        },
      },
    });

    return res.status(200).json(wages);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};

export const isUserMemberOfTeam = async (
  userAddress: Address,
  teamId: number
): Promise<boolean> => {
  let team;

  team = await prisma.team.findFirst({
    where: {
      id: teamId,
      members: {
        some: {
          address: userAddress,
        },
      },
    },
  });

  return !!team;
};

export const isOwnerOfTeam = async (userAddress: Address, teamId: number) => {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      owner: {
        address: userAddress,
      },
    },
  });

  return !!team;
};
