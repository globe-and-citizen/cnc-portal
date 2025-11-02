import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';
import { addNotification, prisma } from '../utils';
import publicClient from '../utils/viem.config';
import bodAbi from '../artifacts/bod.json';
import electionsAbi from '../artifacts/elections.json';

export const addElectionNotifications = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
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
        teamContracts: true,
      },
    });

    if (!team) return errorResponse(404, 'Team not fount', res);

    if (callerAddress !== team?.ownerAddress) {
      const electionAddress = team?.teamContracts.find((c) => c.type === 'Elections')?.address;
      const bodAddress = team?.teamContracts.find((c) => c.type === 'BoardOfDirectors')?.address;

      if (!electionAddress || !bodAddress)
        return errorResponse(404, 'Elections or BOD contract not found for this team', res);

      const owner = await publicClient.readContract({
        address: electionAddress as `0x${string}`,
        abi: electionsAbi,
        functionName: 'owner',
      });

      if (owner !== bodAddress)
        return errorResponse(403, 'Caller is not the owner of the BOD contract', res);

      const members = await publicClient.readContract({
        address: electionAddress as `0x${string}`,
        abi: bodAbi,
        functionName: 'getBoardOfDirectors',
      });

      if (
        !Array.isArray(members) ||
        members.length < 1 ||
        !members.map((m) => m.toLowerCase()).includes(callerAddress.toLowerCase())
      )
        return errorResponse(403, 'Caller is not a member of the BOD', res);

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
    } else {
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
    }
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
