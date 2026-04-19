import { Request, Response } from 'express';

import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import { addMembersBodySchema, deleteMemberParamsSchema, z } from '../validation';

type AddMembersBody = z.infer<typeof addMembersBodySchema>;
type DeleteMemberParams = z.infer<typeof deleteMemberParamsSchema>;

export const deleteMember = async (req: Request, res: Response) => {
  const { id, memberAddress } = req.params as unknown as DeleteMemberParams;
  try {
    // Find the team
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    // Check if the team exists (authz enforced by requireTeamOwner middleware)
    if (!team) {
      return errorResponse(404, 'Team not found', res);
    }
    if (team.ownerAddress === memberAddress) {
      return errorResponse(403, 'Unauthorized: The Owner cannot be removed', res);
    }

    // If member not found in the team, throw an error
    if (!team.members.some((member) => member.address === memberAddress)) {
      return errorResponse(404, 'Member not found in the team', res);
    }

    try {
      await prisma.memberTeamsData.delete({
        where: {
          memberAddress_teamId: { memberAddress, teamId: id },
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return errorResponse(500, message, res);
    }

    await prisma.team.update({
      where: { id },
      data: {
        members: {
          disconnect: { address: memberAddress },
        },
      },
    });
    return res.status(204).end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

export const addMembers = async (req: Request, res: Response) => {
  const { id } = req.params as unknown as { id: number };
  const membersData = req.body as AddMembersBody;

  try {
    // Fetch the team and its current members (authz enforced by requireTeamOwner middleware)
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // List of members in membersData that already exist in the team.members
    const existingMembers = membersData.filter((member) =>
      team.members.some((m) => m.address === member.address)
    );

    if (existingMembers.length > 0) {
      return res.status(400).json({
        message: `Members ${existingMembers.map((member) => member.address)} already in the team`,
      });
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        members: {
          connect: membersData.map((member) => ({
            address: member.address,
          })),
        },
        memberTeamsData: {
          create: membersData.map((member) => ({
            memberAddress: member.address,
          })),
        },
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
      },
    });

    // Return the updated members list
    return res.status(201).json({ members: updatedTeam?.members });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};
