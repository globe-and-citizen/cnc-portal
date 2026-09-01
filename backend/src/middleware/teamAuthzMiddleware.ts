import { NextFunction, Request, Response } from 'express';
import { errorResponse, prisma } from '../utils';

type TeamIdLocation =
  | 'body.teamId'
  | 'query.teamId'
  | 'params.id'
  | 'params.teamId'
  | 'params.claimId'
  | 'params.wageId'
  | 'params.actionId'
  | 'params.weeklyClaimId'
  | 'params.expenseId';

const extractTeamId = (req: Request, location: TeamIdLocation): number | null => {
  const [source, field] = location.split('.') as ['body' | 'query' | 'params', string];
  const raw = (req[source] as Record<string, unknown> | undefined)?.[field];
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const DIRECT_TEAM_ID_LOCATIONS = new Set<TeamIdLocation>([
  'body.teamId',
  'query.teamId',
  'params.id',
  'params.teamId',
]);

/**Per-request memo of resolved team ids, keyed by location. Several of these
guards are chained on the same route (e.g. requireTeamMember + rejectIfArchived on PUT /weekly-claim/:id) */
const resolvedTeamIds = new WeakMap<Request, Map<TeamIdLocation, number | null>>();

const resolveTeamIdUncached = async (
  req: Request,
  location: TeamIdLocation
): Promise<number | null> => {
  if (DIRECT_TEAM_ID_LOCATIONS.has(location)) {
    return extractTeamId(req, location);
  }

  try {
    switch (location) {
      case 'params.claimId': {
        const claimId = Number(req.params.claimId);
        if (!Number.isInteger(claimId) || claimId <= 0) return null;
        const claim = await prisma.claim.findUnique({
          where: { id: claimId },
          select: { wage: { select: { teamId: true } } },
        });
        return claim?.wage.teamId ?? null;
      }
      case 'params.wageId': {
        const wageId = Number(req.params.wageId);
        if (!Number.isInteger(wageId) || wageId <= 0) return null;
        const wage = await prisma.wage.findUnique({
          where: { id: wageId },
          select: { teamId: true },
        });
        return wage?.teamId ?? null;
      }
      case 'params.actionId': {
        const actionId = Number(req.params.id);
        if (!Number.isInteger(actionId) || actionId <= 0) return null;
        const action = await prisma.boardOfDirectorActions.findUnique({
          where: { id: actionId },
          select: { teamId: true },
        });
        return action?.teamId ?? null;
      }
      case 'params.weeklyClaimId': {
        const weeklyClaimId = Number(req.params.id);
        if (!Number.isInteger(weeklyClaimId) || weeklyClaimId <= 0) return null;
        const weeklyClaim = await prisma.weeklyClaim.findUnique({
          where: { id: weeklyClaimId },
          select: { teamId: true },
        });
        return weeklyClaim?.teamId ?? null;
      }
      case 'params.expenseId': {
        const expenseId = Number(req.params.id);
        if (!Number.isInteger(expenseId) || expenseId <= 0) return null;
        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          select: { teamId: true },
        });
        return expense?.teamId ?? null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
};

const resolveTeamId = async (req: Request, location: TeamIdLocation): Promise<number | null> => {
  let perRequest = resolvedTeamIds.get(req);
  if (!perRequest) {
    perRequest = new Map();
    resolvedTeamIds.set(req, perRequest);
  }
  if (perRequest.has(location)) return perRequest.get(location) ?? null;

  const teamId = await resolveTeamIdUncached(req, location);
  perRequest.set(location, teamId);
  return teamId;
};

export const requireTeamOwner =
  (location: TeamIdLocation) => async (req: Request, res: Response, next: NextFunction) => {
    const callerAddress = req.address;
    const teamId = await resolveTeamId(req, location);
    if (teamId === null) return errorResponse(400, `Missing or invalid teamId at ${location}`, res);

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { ownerAddress: true },
      });
      if (!team) return errorResponse(404, 'Team not found', res);
      if (team.ownerAddress !== callerAddress) {
        return errorResponse(403, 'Unauthorized: Caller is not the owner of the team', res);
      }
      return next();
    } catch (error) {
      return errorResponse(500, error, res);
    }
  };

export const requireTeamMember =
  (location: TeamIdLocation) => async (req: Request, res: Response, next: NextFunction) => {
    const callerAddress = req.address;
    const teamId = await resolveTeamId(req, location);
    if (teamId === null) return errorResponse(400, `Missing or invalid teamId at ${location}`, res);

    try {
      const team = await prisma.team.findFirst({
        where: { id: teamId, members: { some: { address: callerAddress } } },
        select: { id: true },
      });
      if (!team) return errorResponse(403, 'Caller is not a member of the team', res);
      return next();
    } catch (error) {
      return errorResponse(500, error, res);
    }
  };

export const rejectIfArchived =
  (location: TeamIdLocation) => async (req: Request, res: Response, next: NextFunction) => {
    const teamId = await resolveTeamId(req, location);
    if (teamId === null) return errorResponse(400, `Missing or invalid teamId at ${location}`, res);

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { isArchived: true },
      });
      if (!team) return errorResponse(404, 'Team not found', res);
      if (team.isArchived) {
        return errorResponse(409, 'Team is archived and cannot be modified', res);
      }
      return next();
    } catch (error) {
      return errorResponse(500, error, res);
    }
  };
