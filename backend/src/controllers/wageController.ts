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
  const {
    teamId,
    userAddress,
    cashRatePerHour,
    tokenRatePerHour,
    maximumHoursPerWeek,
  } = req.body as wageBodyRequest;

  // Validating the wage data
  // Checking require data
  if (
    !teamId ||
    !userAddress ||
    !cashRatePerHour ||
    !tokenRatePerHour ||
    !maximumHoursPerWeek
  ) {
    return errorResponse(400, "Missing parameters", res);
  }

  // Checking if maximumHoursPerWeek is a number, is an integer and is greater than 0
  if (
    isNaN(maximumHoursPerWeek) ||
    !Number.isInteger(maximumHoursPerWeek) ||
    maximumHoursPerWeek <= 0
  ) {
    return errorResponse(400, "Invalid maximumHoursPerWeek", res);
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
  try {
    await prisma.memberTeamsData.findUniqueOrThrow({
      where: {
        userAddress_teamId: {
          teamId: Number(teamId),
          userAddress: userAddress,
        },
      },
    });
  } catch (error) {
    return errorResponse(404, "Member not found in the team", res);
  } finally {
    await prisma.$disconnect();
  }

  try {
    // Check if the user has a current wage
    const wage = await prisma.wage.findUnique({
      where: {
        teamId: Number(teamId),
        userAddress,
        nextWageId: undefined,
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
          nextWageId: undefined,
        },
      });
      res.status(201).json(wage);
    }
  } catch (error) {
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};
