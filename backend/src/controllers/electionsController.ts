import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';
import { addNotification, prisma } from '../utils';

/**
 * Notifies every member of a team that a board election has been created.
 *
 * Only the team owner can reach this: the Elections contract is owned by the
 * person who set the team up and `createElection` is owner-only, so nobody else
 * can have an election to announce.
 */
export const addElectionNotifications = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const teamId = Number(req.params.teamId);

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: {
          select: {
            address: true,
          },
        },
      },
    });

    if (!team) return errorResponse(404, 'Team not found', res);

    if (callerAddress !== team.ownerAddress)
      return errorResponse(403, 'Only the team owner can send election notifications', res);

    addNotification(
      team.members.map((member) => member.address),
      {
        message: `New election created you are invited to participate`,
        subject: 'New Election Created',
        author: callerAddress || '',
        resource: `elections/${team.id}`,
      }
    );
    res.status(201).json(null);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
