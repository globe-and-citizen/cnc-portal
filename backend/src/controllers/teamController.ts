import { /*PrismaClient,*/ TeamContract, TeamOfficer, User } from '@prisma/client';
import { Request, Response } from 'express';
import { isAddress } from 'viem';
import { addNotification, prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import { resolveStorageImageUrl } from '../utils/profileImage.util';
//const prisma = new PrismaClient();

// Shared: include the immediate predecessor (id + address only) so clients
// can walk one step back for copy-forward flows (e.g. shareholder migration)
// without a second round-trip.
const previousOfficerInclude = {
  previousOfficer: { select: { id: true, address: true } },
} as const;

// Prisma include shape that fetches the linked list head — the TeamOfficer
// row that has no successor pointing back to it. This is the team's current
// Officer. Returned as a single-element array because Prisma includes are
// always relations; we flatten it to `currentOfficer` in the response.
export const currentOfficerInclude = {
  teamOfficers: {
    where: { nextOfficer: { is: null } },
    take: 1,
    include: previousOfficerInclude,
  },
} as const;

// Same as currentOfficerInclude, but also loads the contracts governed by the
// current Officer. Use on endpoints that expose `teamContracts` on the team —
// we want the live set (contracts of the current Officer), not the union of
// every Officer's contracts across history.
//
// Safe and SafeDepositRouter are intentionally stored with officerId = NULL
// because they survive Officer redeploys. Load them off the team relation
// directly so they remain visible alongside the current Officer's contracts.
export const currentOfficerWithContractsInclude = {
  teamOfficers: {
    where: { nextOfficer: { is: null } },
    take: 1,
    include: { ...previousOfficerInclude, contracts: true },
  },
  teamContracts: {
    where: { officerId: null },
  },
} as const;

// Serialize a TeamOfficer for API responses: BigInt isn't valid JSON, so
// deployBlockNumber must be stringified.
export const serializeOfficer = (o: TeamOfficer | undefined | null) =>
  o
    ? {
        ...o,
        deployBlockNumber: o.deployBlockNumber?.toString() ?? null,
      }
    : null;

// Pulls the head of the linked list out of an `include: currentOfficerInclude`
// result and exposes it as `currentOfficer`. Removes the raw `teamOfficers`
// array so consumers don't accidentally rely on the implementation detail.
const withCurrentOfficer = <T extends { teamOfficers?: TeamOfficer[] }>(team: T) => {
  const { teamOfficers, ...rest } = team;
  return {
    ...rest,
    currentOfficer: serializeOfficer(teamOfficers?.[0]),
  };
};

// Same as withCurrentOfficer but additionally surfaces the current Officer's
// contracts as `teamContracts` on the team — scoping the contract list to the
// currently active generation so archived contracts don't leak out.
const withCurrentOfficerAndContracts = <
  T extends {
    teamOfficers?: (TeamOfficer & { contracts: TeamContract[] })[];
    teamContracts?: TeamContract[];
  },
>(
  team: T
) => {
  const { teamOfficers, teamContracts, ...rest } = team;
  const head = teamOfficers?.[0];
  const { contracts, ...headWithoutContracts } = head ?? { contracts: [] };
  return {
    ...rest,
    currentOfficer: serializeOfficer(head ? (headWithoutContracts as TeamOfficer) : null),
    // Merge the current Officer's contracts with officer-less contracts
    // (Safe / SafeDepositRouter) so the client sees the full live set.
    teamContracts: [...contracts, ...(teamContracts ?? [])],
  };
};

// Create a new team
const addTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { name, members, description } = req.body;
  const callerAddress = req.address;
  try {
    // Validate all members' wallet addresses
    for (const member of members) {
      if (!isAddress(member.address)) {
        return errorResponse(400, `Invalid wallet address for member: ${member.name}`, res);
      }
    }

    // Find the owner (user) by their address
    const owner = await prisma.user.findUnique({
      where: {
        address: String(callerAddress),
      },
    });

    if (!owner) {
      return errorResponse(404, 'Owner not found', res);
    }

    // Ensure the owner's wallet address is in the members list
    if (!members.some((member: User) => member.address === callerAddress)) {
      members.push({
        name: owner.name,
        address: owner.address,
      });
    }

    // Create the team with the members connected and membership tracking records
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerAddress: String(callerAddress),
        members: {
          connect: members.map((member: User) => ({
            address: member.address,
          })),
        },
        memberTeamsData: {
          create: members.map((member: User) => ({
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

    addNotification(
      members.map((member: User) => member.address),
      {
        message: `You have been added to a new team: ${name} by ${owner.name}`,
        subject: 'Team Invitation',
        author: owner.address?.toString() || '',
        resource: `teams/${team.id}`,
      }
    );
    res.status(201).json(team);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};
// Get Team
const getTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const callerAddress = req.address;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
            imageUrl: true,
            Wage: {
              where: {
                teamId: Number(id), // wage de cette équipe uniquement
                nextWageId: null, // nextWageId null = wage actuel (pas de successeur)
              },
              take: 1,
            },
          },
        },
        ...currentOfficerWithContractsInclude,
      },
    });

    // Handle 404
    if (!team) {
      return errorResponse(404, 'Team not found', res);
    }

    if (!isUserPartOfTheTeam(team?.members ?? [], callerAddress)) {
      return errorResponse(403, 'Unauthorized', res);
    }

    const membersWithResolvedImages = await Promise.all(
      team.members.map(async (member) => ({
        ...member,
        imageUrl: await resolveStorageImageUrl(member.imageUrl),
        currentWage: member.Wage[0] ?? null, // aplatir le tableau
        Wage: undefined, // retirer le tableau brut
      }))
    );

    res.status(200).json({
      ...withCurrentOfficerAndContracts(team),
      members: membersWithResolvedImages,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

// Get teams - either all teams or user-specific teams
const getAllTeams = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const callerAddress = String(req.address);
  const userAddress = req.query.userAddress as string | undefined;
  try {
    // If userAddress is provided, verify the caller is requesting their own teams
    if (userAddress) {
      if (userAddress !== callerAddress) {
        return errorResponse(403, 'Unauthorized', res);
      }

      // Get teams where the user is a member
      const memberTeams = await prisma.team.findMany({
        where: {
          members: {
            some: {
              address: callerAddress,
            },
          },
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
          ...currentOfficerInclude,
        },
      });

      return res.status(200).json(memberTeams.map(withCurrentOfficer));
    }

    // No userAddress provided - return all teams
    const allTeams = await prisma.team.findMany({
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        ...currentOfficerInclude,
      },
    });

    res.status(200).json(allTeams.map(withCurrentOfficer));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

// Update team

const updateTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const callerAddress = req.address;

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!team) {
      return errorResponse(404, 'Team not found', res);
    }

    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, 'Unauthorized', res);
    }

    const teamU = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
        ...currentOfficerWithContractsInclude,
      },
    });
    res.status(200).json(withCurrentOfficerAndContracts(teamU));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

// Delete Team
const deleteTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const callerAddress = req.address;
  try {
    const team = await prisma.team.findUnique({ where: { id: Number(id) } });
    if (!team) {
      return errorResponse(404, 'Team not found', res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, 'Unauthorized', res);
    }
    // Cascading deletes handle all related records (teamContracts, memberTeamsData, wages, claims, etc.)
    await prisma.team.delete({ where: { id: Number(id) } });

    return res.status(204).send();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

const isUserPartOfTheTeam = (
  members: { address: string; name?: string | null }[],
  callerAddress: string
) => {
  return members.some((member) => member.address === callerAddress);
};

// const buildFilterMember = (queryParams: Request["query"]) => {
//   const filterQuery: Prisma.UserWhereInput = {};
//   if (queryParams.query) {
//     filterQuery.OR = [
//       { name: { contains: String(queryParams.query), mode: "insensitive" } },
//       { address: { contains: String(queryParams.query), mode: "insensitive" } },
//     ];
//   }

//   // can add others filter

//   return filterQuery;
// };

export { addTeam, deleteTeam, getAllTeams, getTeam, updateTeam };
