import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
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
  const body = req.body as SetWageBody;
  const {
    teamId,
    userAddress,
    maximumHoursPerWeek,
    maximumHoursPerDay,
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
    maximumHoursPerDay,
    maximumOvertimeHoursPerWeek,
    ratePerHour,
    overtimeRatePerHour: overtimeRatePerHourValue,
  };

  try {
    // authz enforced by requireTeamOwner middleware
    const activeWage = await prisma.wage.findFirst({
      where: { teamId, userAddress, nextWageId: null },
    });

    if (activeWage) {
      if (activeWage.disabled) {
        return errorResponse(400, 'Cannot set wage: the current wage is disabled', res);
      }

      // A new version becomes current immediately. Existing weekly claims
      // retain their wage reference, so this does not reprice or split a week
      // that already contains submitted daily claims.
      const createdWage = await prisma.$transaction(async (tx) => {
        const newWage = await tx.wage.create({ data: wagePayload });
        await tx.wage.update({
          where: { id: activeWage.id },
          data: { nextWageId: newWage.id },
        });
        return newWage;
      });

      return res.status(201).json(createdWage);
    }

    const wages = await prisma.wage.findMany({ where: { teamId, userAddress } });
    if (wages.length > 0) {
      return errorResponse(500, 'User has a wage not chained', res);
    }

    const createdWage = await prisma.wage.create({ data: wagePayload });
    return res.status(201).json(createdWage);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const getWages = async (req: Request, res: Response) => {
  const { teamId } = req.query as unknown as z.infer<typeof getWagesQuerySchema>;

  try {
    // authz enforced by requireTeamMember middleware. Only the current version
    // is returned; historical versions remain attached to their weekly claims.
    const wages = await prisma.wage.findMany({
      where: { teamId, nextWageId: null },
      orderBy: { id: 'asc' },
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
      include: { team: { select: { ownerAddress: true } } },
    });

    if (!wage) {
      return errorResponse(404, 'Wage not found', res);
    }

    if (wage.team.ownerAddress !== callerAddress) {
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
