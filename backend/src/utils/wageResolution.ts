import { prisma } from './dependenciesUtil';

/**
 * Return the member's current wage version.
 *
 * A wage change becomes current as soon as the owner saves it. Existing
 * weekly claims keep their own wage reference; only a new or goals-only week
 * needs this lookup to decide which version prices its first daily claim.
 */
export async function resolveCurrentWage(teamId: number, userAddress: string) {
  return prisma.wage.findFirst({
    where: { teamId, userAddress, nextWageId: null },
  });
}
