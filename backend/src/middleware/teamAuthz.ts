import { Address } from 'viem';
import { prisma } from '../utils';

/**
 * Team-relationship predicates used by the team authz middleware. Exported so
 * controllers can also run the same check inline when the route-level
 * middleware is not applicable (e.g. when the teamId has to be derived from
 * another lookup first).
 *
 * Lives in a separate module from the middleware factories so that tests can
 * mock these predicates without replacing the middleware itself.
 */

export const isUserMemberOfTeam = async (
  userAddress: Address,
  teamId: number
): Promise<boolean> => {
  const team = await prisma.team.findFirst({
    where: { id: teamId, members: { some: { address: userAddress } } },
  });
  return !!team;
};

export const isOwnerOfTeam = async (userAddress: Address, teamId: number): Promise<boolean> => {
  const team = await prisma.team.findFirst({
    where: { id: teamId, owner: { address: userAddress } },
  });
  return !!team;
};
