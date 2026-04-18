import { Request, Response } from 'express';

import { Prisma } from '@prisma/client';
import { Address } from 'viem';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import {
  getWagesQuerySchema,
  setWageBodySchema,
  toggleWageStatusParamsSchema,
  toggleWageStatusQuerySchema,
  z,
} from '../validation';

type SetWageBody = z.infer<typeof setWageBodySchema>;

export const setWage = async (req: Request, res: Response) => {
  const callerAddress = req.address;

  const body = req.body as SetWageBody;
  const {
    teamId,
    userAddress,
    maximumHoursPerWeek,
    maximumOvertimeHoursPerWeek: rawOvertimeHours,
    ratePerHour,
    overtimeRatePerHour,
  } = body;
  const maximumOvertimeHoursPerWeek = rawOvertimeHours ?? 0;

  const overtimeRatePerHourValue =
    overtimeRatePerHour === null ? Prisma.DbNull : (overtimeRatePerHour ?? Prisma.DbNull);

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
      if (currentWage.disabled) {
        return errorResponse(400, 'Cannot set wage: the current wage is disabled', res);
      }

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
  const { teamId } = req.query as unknown as z.infer<typeof getWagesQuerySchema>;

  try {
    // authz enforced by requireTeamMember middleware
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

export const toggleWageStatus = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { wageId } = req.params as unknown as z.infer<typeof toggleWageStatusParamsSchema>;
  const { action } = req.query as unknown as z.infer<typeof toggleWageStatusQuerySchema>;

  try {
    const wage = await prisma.wage.findFirst({
      where: { id: wageId, nextWageId: null },
    });

    if (!wage) {
      return errorResponse(404, 'Wage not found', res);
    }

    if (!(await isOwnerOfTeam(callerAddress, wage.teamId))) {
      return errorResponse(403, 'Caller is not the owner of the team', res);
    }

    const updatedWage = await prisma.wage.update({
      where: { id: wageId },
      data: { disabled: action === 'disable' },
    });

    return res.status(200).json(updatedWage);
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
