import { NextFunction, Request, Response } from 'express';
import { errorResponse, prisma } from '../utils';
import { isUserMemberOfTeam } from './teamAuthz';
export { isOwnerOfTeam, isUserMemberOfTeam } from './teamAuthz';

type TeamIdLocation = 'body.teamId' | 'query.teamId' | 'params.id' | 'params.teamId';

const extractTeamId = (req: Request, location: TeamIdLocation): number | null => {
  const [source, field] = location.split('.') as ['body' | 'query' | 'params', string];
  const raw = (req[source] as Record<string, unknown> | undefined)?.[field];
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const requireTeamOwner =
  (location: TeamIdLocation) => async (req: Request, res: Response, next: NextFunction) => {
    const callerAddress = req.address;
    const teamId = extractTeamId(req, location);
    if (teamId === null) return errorResponse(400, `Missing or invalid teamId at ${location}`, res);

    try {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
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
    const teamId = extractTeamId(req, location);
    if (teamId === null) return errorResponse(400, `Missing or invalid teamId at ${location}`, res);

    try {
      if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
        return errorResponse(403, 'Caller is not a member of the team', res);
      }
      return next();
    } catch (error) {
      return errorResponse(500, error, res);
    }
  };
