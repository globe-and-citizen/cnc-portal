import { Request, Response } from "express";

import { Address, isAddress } from "viem";
import { errorResponse } from "../utils/utils";
import { addNotification, prisma } from "../utils";
import { Prisma, User, Wage } from "@prisma/client";

type wageBodyRequest = Pick<
  Wage,
  | "teamId"
  | "userAddress"
  | "cashRatePerHour"
  | "tokenRatePerHour"
  | "maximumHoursPerWeek"
>;
export const setWage = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;

  const body = req.body as wageBodyRequest;
  const teamId = Number(body.teamId);
  const userAddress = body.userAddress as Address;
  const cashRatePerHour = Number(body.cashRatePerHour);
  const tokenRatePerHour = Number(body.tokenRatePerHour);
  const maximumHoursPerWeek = Number(body.maximumHoursPerWeek);

  // Validating the wage data
  // Checking require data
  console.log({
    teamId,
    userAddress,
    cashRatePerHour,
    tokenRatePerHour,
    maximumHoursPerWeek,
  });
  if (
    teamId === undefined ||
    userAddress === undefined ||
    cashRatePerHour === undefined ||
    tokenRatePerHour === undefined ||
    maximumHoursPerWeek === undefined
  ) {
    // Check wich parameter is missing
    let missingParameters = [];
    if (teamId === undefined) missingParameters.push("teamId");
    if (userAddress === undefined) missingParameters.push("userAddress");
    if (cashRatePerHour === undefined)
      missingParameters.push("cashRatePerHour");
    if (tokenRatePerHour === undefined)
      missingParameters.push("tokenRatePerHour");
    if (maximumHoursPerWeek === undefined)
      missingParameters.push("maximumHoursPerWeek");

    return errorResponse(400, `Missing parameters ${missingParameters}`, res);
  }

  // Checking if maximumHoursPerWeek is a number, is an integer and is greater than 0
  let errors = [];

  if (!Number.isInteger(maximumHoursPerWeek) || maximumHoursPerWeek <= 0) {
    errors.push("Invalid maximumHoursPerWeek");
  }

  if (isNaN(cashRatePerHour) || cashRatePerHour <= 0) {
    errors.push("Invalid cashRatePerHour");
  }

  if (isNaN(tokenRatePerHour)) {
    errors.push("Invalid tokenRatePerHour");
  }

  if (errors.length > 0) {
    return errorResponse(400, `Errors: ${errors.join(", ")}`, res);
  }

  // Checking if cashRatePerHour is a number and is greater than 0
  if (isNaN(cashRatePerHour) || cashRatePerHour <= 0) {
    return errorResponse(400, "Invalid cashRatePerHour", res);
  }

  // Checking if tokenRatePerHour is a number and is greater than 0
  if (isNaN(tokenRatePerHour)) {
    return errorResponse(400, "Invalid tokenRatePerHour", res);
  }

  // check if the member is part of the provided team
  if (!(await isUserMemberOfTeam(userAddress, teamId))) {
    return errorResponse(404, "Member not found in the team", res);
  }

  try {
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
        return errorResponse(400, "User has a wage not chained", res);
      }

      // Create first wage
      await prisma.wage.create({
        data: {
          teamId: Number(teamId),
          userAddress,
          cashRatePerHour,
          tokenRatePerHour,
          maximumHoursPerWeek,
        },
      });
      res.status(201).json(wage);
    }
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};

async function isUserMemberOfTeam(
  userAddress: Address,
  teamId: number
): Promise<boolean> {
  let team;
  try {
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
  } catch (error) {
    console.log("Error: ", error);
    return false;
  }

  return team !== null;
}
