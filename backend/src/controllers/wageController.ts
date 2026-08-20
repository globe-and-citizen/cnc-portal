import { Request, Response } from 'express';

import { Prisma } from '@prisma/client';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import {
  currentWeekStart,
  effectiveFromForChange,
  isScheduledWage,
  membersWithClaimsThisWeek,
  splitCurrentAndScheduled,
  weekHasClaims,
} from '../utils/wageResolution';
import {
  cancelScheduledWageQuerySchema,
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

    // Find the leaf of the wage chain (the most recent wage record).
    const leafWage = await prisma.wage.findFirst({
      where: {
        teamId,
        userAddress,
        nextWageId: null,
      },
    });

    if (leafWage) {
      // A change only waits for next Monday when the member has already
      // submitted hours for this week — those hours are priced against the
      // current wage and cannot be repriced without splitting the week. A week
      // with no hours in it takes the change whole, from its own Monday.
      const weekIsSubmitted = await weekHasClaims(teamId, userAddress, currentWeekStart());
      const effectiveFrom = effectiveFromForChange(weekIsSubmitted);

      if (isScheduledWage(leafWage)) {
        const activePredecessor = await prisma.wage.findFirst({
          where: { teamId, userAddress, nextWageId: leafWage.id },
        });

        if (activePredecessor?.disabled) {
          return errorResponse(400, 'Cannot set wage: the current wage is disabled', res);
        }

        // The date is recomputed, not preserved. A change queued while the week
        // held hours must stop waiting once it no longer does — otherwise the
        // wait outlives its reason and there is no way to call it off. This can
        // only pull the date forward to the current Monday: for a week that
        // still holds hours the rule returns the same next Monday it did
        // before, so a correction never pushes the change back a week.
        const updatedWage = await prisma.wage.update({
          where: { id: leafWage.id },
          data: { ...wagePayload, effectiveFrom },
        });
        return res.status(200).json(updatedWage);
      }

      // The leaf is the currently active wage.
      const activeWage = leafWage;

      if (activeWage.disabled) {
        return errorResponse(400, 'Cannot set wage: the current wage is disabled', res);
      }

      // Create wage and chain it to the previous wage. Done in a transaction
      // so the deferrable Wage_active_unique constraint is checked at COMMIT,
      // after the old wage's nextWageId has been set.
      const createdWage = await prisma.$transaction(async (tx) => {
        const newWage = await tx.wage.create({
          data: { ...wagePayload, effectiveFrom },
        });
        await tx.wage.update({
          where: { id: activeWage.id },
          data: { nextWageId: newWage.id },
        });
        return newWage;
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

    // Create first wage. Anchored to the current Monday like every other
    // change, so that every effective date in the chain is a week boundary
    // rather than the mid-week timestamp `createdAt` would provide.
    const createdWage = await prisma.wage.create({
      data: { ...wagePayload, effectiveFrom: currentWeekStart() },
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
    //
    // Callers use this endpoint to know the rates and caps that apply right now
    // — the claim form validates against them — so the operative wage is
    // returned at the top level with any upcoming change attached as
    // `scheduledWage`.
    //
    // The whole chain is fetched in one query and split in memory: resolving
    // per member would issue a query each, and reading the leaf directly would
    // let the screen disagree with what the claim engine charges.
    const allWages = await prisma.wage.findMany({
      where: { teamId },
      orderBy: { id: 'asc' },
    });

    const chainsByMember = new Map<string, typeof allWages>();
    for (const wage of allWages) {
      const chain = chainsByMember.get(wage.userAddress);
      if (chain) chain.push(wage);
      else chainsByMember.set(wage.userAddress, [wage]);
    }

    // Which members have already submitted this week decides when a change
    // saved now would take effect, so the owner is told the real date instead
    // of the front end guessing it — the two would drift the moment the rule
    // changes.
    const now = new Date();
    const submittedThisWeek = await membersWithClaimsThisWeek(teamId, now);

    const wages = Array.from(chainsByMember.values()).flatMap((chain) => {
      const { current, scheduled } = splitCurrentAndScheduled(chain, now);
      if (!current) return [];

      return [
        {
          ...current,
          scheduledWage: scheduled,
          nextChangeEffectiveFrom: effectiveFromForChange(
            submittedThisWeek.has(current.userAddress),
            now
          ),
        },
      ];
    });

    return res.status(200).json(wages);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

/**
 * Cancel a wage change that was scheduled but has not taken effect yet.
 *
 * The scheduled row is deleted and the predecessor becomes the leaf again, so
 * the chain returns to exactly the state it had before the change was made.
 * Refused once the change is live — claims may already reference it by then.
 */
export const cancelScheduledWage = async (req: Request, res: Response) => {
  const { teamId, userAddress } = req.query as unknown as z.infer<
    typeof cancelScheduledWageQuerySchema
  >;

  try {
    // authz enforced by requireTeamOwner middleware
    const leafWage = await prisma.wage.findFirst({
      where: { teamId, userAddress, nextWageId: null },
    });

    if (!leafWage || !isScheduledWage(leafWage)) {
      return errorResponse(404, 'No scheduled wage change to cancel', res);
    }

    const predecessor = await prisma.wage.findFirst({
      where: { teamId, userAddress, nextWageId: leafWage.id },
    });

    if (!predecessor) {
      return errorResponse(409, 'Cannot cancel: the scheduled wage has no predecessor', res);
    }

    // Unlink before deleting so the deferrable Wage_active_unique constraint
    // never sees two active leaves at once.
    await prisma.$transaction(async (tx) => {
      await tx.wage.update({
        where: { id: predecessor.id },
        data: { nextWageId: null },
      });
      await tx.wage.delete({ where: { id: leafWage.id } });
    });

    return res.status(200).json(predecessor);
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
    // Allow toggling the leaf wage **or** the active predecessor when a
    // scheduled wage exists (the predecessor's nextWageId points to the
    // scheduled leaf whose effectiveFrom is in the future).
    const wage = await prisma.wage.findFirst({
      where: {
        id: wageId,
        OR: [
          { nextWageId: null },
          {
            nextWage: {
              nextWageId: null,
              effectiveFrom: { gt: new Date() },
            },
          },
        ],
      },
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
