import { Request, Response } from 'express';

import { Prisma, Wage } from '@prisma/client';
import { Address } from 'viem';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';

type WageRate = {
  type: string;
  amount: number;
};

type wageBodyRequest = Pick<Wage, 'teamId' | 'userAddress' | 'maximumHoursPerWeek'> & {
  ratePerHour: WageRate[];
  overtimeRatePerHour?: WageRate[] | null;
  maximumOvertimeHoursPerWeek?: number | null;
};

export const setWage = async (req: Request, res: Response) => {
  const callerAddress = req.address;

  const body = req.body as wageBodyRequest;
  const teamId = Number(body.teamId);
  const userAddress = body.userAddress as Address;
  const maximumHoursPerWeek = Number(body.maximumHoursPerWeek);
  const maximumOvertimeHoursPerWeek =
    body.maximumOvertimeHoursPerWeek != null ? Number(body.maximumOvertimeHoursPerWeek) : 0;

  const ratePerHour = body.ratePerHour?.map((rate) => ({
    type: rate.type,
    amount: Number(rate.amount),
  }));

  const overtimeRatePerHour = body.overtimeRatePerHour?.map((rate) => ({
    type: rate.type,
    amount: Number(rate.amount),
  }));

  const hasOvertimeRates =
    Array.isArray(body.overtimeRatePerHour) && body.overtimeRatePerHour.length > 0;

  if (hasOvertimeRates && maximumOvertimeHoursPerWeek == null) {
    return errorResponse(
      400,
      'maximumOvertimeHoursPerWeek is required when overtimeRatePerHour is provided',
      res
    );
  }

  const overtimeRatePerHourValue =
    body.overtimeRatePerHour === null ? Prisma.DbNull : (overtimeRatePerHour ?? Prisma.DbNull);

  const wagePayload = {
    teamId,
    userAddress,
    maximumHoursPerWeek,
    maximumOvertimeHoursPerWeek,
    ratePerHour,
    overtimeRatePerHour: overtimeRatePerHourValue,
  };

  try {
    // Check if the caller is the owner of the team
    if (!(await isOwnerOfTeam(callerAddress, teamId))) {
      return errorResponse(403, 'Caller is not the owner of the team', res);
    }

    // Check if the user has a current wage
    const currentWage = await prisma.wage.findFirst({
      where: {
        teamId,
        userAddress,
        nextWageId: null,
      },
    });

    if (currentWage) {
      // Create wage and chain it to the previous wage
      const createdWage = await prisma.wage.create({
        data: {
          ...wagePayload,
          previousWage: {
            connect: { id: currentWage.id },
          },
        },
      });

      return res.status(201).json(createdWage);
    }

    // Check if the user has wages not chained (should not be possible)
    const wages = await prisma.wage.findMany({
      where: { teamId, userAddress },
    });

    if (wages.length > 0) {
      return errorResponse(500, 'User has a wage not chained', res);
    }

    // Create first wage
    const createdWage = await prisma.wage.create({
      data: wagePayload,
    });

    return res.status(201).json(createdWage);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};
export const getWages = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const teamId = Number(req.query.teamId);

  try {
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, 'Member is not a team member', res);
    }
    const wages = await prisma.wage.findMany({
      where: {
        teamId,
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
