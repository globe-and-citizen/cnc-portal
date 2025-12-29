import { Request, Response } from 'express';

import { Wage } from '@prisma/client';
import { Address } from 'viem';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';

type wageBodyRequest = Pick<
  Wage,
  | 'teamId'
  | 'userAddress'
  // | "cashRatePerHour"
  // | "tokenRatePerHour"
  | 'maximumHoursPerWeek'
  | 'ratePerHour'
  // | "usdcRatePerHour"
> & {
  ratePerHour: Array<{
    type: string;
    amount: number;
  }>;
};
export const setWage = async (req: Request, res: Response) => {
  const callerAddress = req.address;

  const body = req.body as wageBodyRequest;
  const teamId = Number(body.teamId);
  const userAddress = body.userAddress as Address;
  const maximumHoursPerWeek = Number(body.maximumHoursPerWeek);
  let ratePerHour = body.ratePerHour;

  ratePerHour = ratePerHour?.map((rate) => ({
    type: rate.type,
    amount: Number(rate.amount),
  }));

  try {
    // Check if the caller is the owner of the team
    if (!(await isOwnerOfTeam(callerAddress, teamId))) {
      return errorResponse(403, 'Caller is not the owner of the team', res);
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
          maximumHoursPerWeek,
          ratePerHour,
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
        return errorResponse(500, 'User has a wage not chained', res);
      }

      // Create first wage
      const createdWage = await prisma.wage.create({
        data: {
          teamId: Number(teamId),
          userAddress,
          // cashRatePerHour,
          // tokenRatePerHour,
          maximumHoursPerWeek,
          // usdcRatePerHour
          ratePerHour,
        },
      });
      res.status(201).json(createdWage);
    }
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};
// /wage/?teamId=teamId
export const getWages = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const teamId = Number(req.query.teamId);

  // find the team and check if the caller is the owner
  // TODO: in the future only the owner should be able to see the wages

  // Find user wages
  try {
    // check if the member is part of the provided team
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, 'Member is not a team member', res);
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
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const isUserMemberOfTeam = async (
  userAddress: Address,
  teamId: number
): Promise<boolean> => {
  const team = await prisma.team.findFirst({
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
