import { Prisma, TeamContract, TeamOfficer, User, Wage } from '@prisma/client';
import { Request, Response } from 'express';
import { isAddress } from 'viem';
import { addNotification, prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import { resolveStorageImageUrl } from '../utils/profileImage.util';
import { generateUniqueSlug } from '../utils/slug.util';
import { isActiveOfficerVersion } from '../utils/officerVersion';
import { isAdmin } from '../utils/roleUtils';
import { splitCurrentAndScheduled } from '../utils/wageResolution';
import { UserRoles } from '../types/roles';

// A slug is taken when some team already holds it.
const isTeamSlugTaken = async (slug: string) =>
  Boolean(await prisma.team.findUnique({ where: { slug }, select: { id: true } }));

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
//
// Also loads the contracts governed by the current Officer, so endpoints that
// expose `teamContracts` see the live set (contracts of the current Officer),
// not the union of every Officer's contracts across history.
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

// True iff the current Officer belongs to the active generation for the
// backend's configured network. This keeps Hardhat V2 validation from marking
// Polygon teams migrated before the Polygon deployment is complete. It matches
// the generation's whole version range, so a point release within the active
// generation (2.1.0) still counts as migrated.
const deriveIsMigrated = (officer: { version?: string | null } | null | undefined) =>
  isActiveOfficerVersion(officer?.version);

const isTruthyQueryFlag = (value: unknown) => value === true || value === 'true';

// Pulls the head of the linked list out of an
// `include: currentOfficerWithContractsInclude` result and exposes it as
// `currentOfficer`, and surfaces the current Officer's contracts as
// `teamContracts` — scoping the contract list to the currently active
// generation so archived contracts don't leak out. Removes the raw
// `teamOfficers` array so consumers don't rely on the implementation detail.
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
    isMigrated: deriveIsMigrated(head ?? null),
    // Merge the current Officer's contracts with officer-less contracts
    // (Safe / SafeDepositRouter) so the client sees the full live set.
    teamContracts: [...contracts, ...(teamContracts ?? [])],
  };
};

/**
 * One deployment generation of a team's contracts, tagged with the deploy block
 * the accounting scan starts from. Officer-less pockets (Safe / SafeDepositRouter)
 * survive redeploys and come back as a single generation with null deploy fields.
 */
export type ContractGeneration = {
  officerAddress: string | null;
  deployBlockNumber: string | null;
  deployedAt: Date | null;
  contracts: TeamContract[];
};

/**
 * Load every generation of a team's contracts across the full Officer history,
 * so the accounting layer keeps pre-migration transactions after a redeploy
 * (issue #2456). A migration never deletes old rows, so this union is complete.
 */
export const loadContractHistory = async (teamId: number): Promise<ContractGeneration[]> => {
  const officers = await prisma.teamOfficer.findMany({
    where: { teamId },
    include: { contracts: true },
    orderBy: [{ deployBlockNumber: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
  });

  const generations: ContractGeneration[] = officers.map((officer) => ({
    officerAddress: officer.address,
    deployBlockNumber: officer.deployBlockNumber?.toString() ?? null,
    deployedAt: officer.deployedAt,
    contracts: officer.contracts,
  }));

  const officerless = await prisma.teamContract.findMany({
    where: { teamId, officerId: null },
  });
  if (officerless.length > 0) {
    generations.push({
      officerAddress: null,
      deployBlockNumber: null,
      deployedAt: null,
      contracts: officerless,
    });
  }

  return generations;
};

// The team list card shows the viewer's own wage status ("Wage set" vs "No wage
// set"), not the whole roster's. Fetch the caller's leaf wages across the
// listed teams in a single query, then resolve to the active wage when a
// scheduled change exists (effectiveFrom in the future).
const findCallerWagesByTeamId = async (callerAddress: string, teamIds: number[]) => {
  if (teamIds.length === 0) return new Map<number, Wage>();

  const leafWages = await prisma.wage.findMany({
    where: {
      userAddress: callerAddress,
      teamId: { in: teamIds },
      nextWageId: null,
    },
  });

  const now = new Date();
  const scheduledLeafIds = leafWages
    .filter((w) => w.effectiveFrom && w.effectiveFrom > now)
    .map((w) => w.id);

  // When some leaves are scheduled, batch-fetch their predecessors.
  let predecessorMap = new Map<number, Wage>();
  if (scheduledLeafIds.length > 0) {
    const predecessors = await prisma.wage.findMany({
      where: {
        userAddress: callerAddress,
        nextWageId: { in: scheduledLeafIds },
      },
    });
    predecessorMap = new Map(predecessors.map((p) => [p.nextWageId!, p]));
  }

  const result = new Map<number, Wage>();
  for (const leaf of leafWages) {
    const isScheduled = leaf.effectiveFrom && leaf.effectiveFrom > now;
    const activeWage = isScheduled ? (predecessorMap.get(leaf.id) ?? leaf) : leaf;
    result.set(activeWage.teamId, activeWage);
  }
  return result;
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

    // Teams may share a name; the unique identifier is a slug auto-generated
    // from the name (acme-corp, acme-corp-2, …).
    const createTeamWithSlug = (slug: string) =>
      prisma.team.create({
        data: {
          name,
          slug,
          description,
          isArchived: false,
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

    // Create the team with the members connected and membership tracking records.
    let team;
    try {
      team = await createTeamWithSlug(await generateUniqueSlug(name, isTeamSlugTaken));
    } catch (error: unknown) {
      // Rare race: another team claimed the slug between the uniqueness check
      // and the insert. Regenerate once and retry before giving up.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        team = await createTeamWithSlug(await generateUniqueSlug(name, isTeamSlugTaken));
      } else {
        throw error;
      }
    }

    addNotification(
      members.map((member: User) => member.address),
      {
        message: `You have been added to a new team: ${name} by ${owner.name}`,
        subject: 'Team Invitation',
        author: owner.address?.toString() || '',
        resource: `teams/${team.id}`,
      }
    );
    res.status(201).json({
      ...team,
      isHidden: false,
      isArchived: team.isArchived ?? false,
    });
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
                teamId: Number(id),
              },
              orderBy: {
                id: 'asc',
              },
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

    // Platform admins inspect teams they are not members of from the admin
    // dashboard, so membership is only required for regular users.
    const callerRoles = (req.user?.roles ?? []) as UserRoles;
    if (!isUserPartOfTheTeam(team?.members ?? [], callerAddress) && !isAdmin(callerRoles)) {
      return errorResponse(403, 'Unauthorized', res);
    }

    const now = new Date();
    const membersWithResolvedImages = await Promise.all(
      team.members.map(async (member) => {
        const { current, scheduled } = splitCurrentAndScheduled(member.Wage, now);
        return {
          ...member,
          imageUrl: await resolveStorageImageUrl(member.imageUrl),
          currentWage: current,
          scheduledWage: scheduled,
          Wage: undefined,
        };
      })
    );

    const callerMemberData = await prisma.memberTeamsData.findUnique({
      where: {
        memberAddress_teamId: {
          memberAddress: String(callerAddress),
          teamId: Number(id),
        },
      },
      select: { isHidden: true },
    });

    const contractHistory = isTruthyQueryFlag(req.query.includeContractHistory)
      ? await loadContractHistory(Number(id))
      : undefined;

    res.status(200).json({
      ...withCurrentOfficerAndContracts(team),
      ...(contractHistory ? { contractHistory } : {}),
      isHidden: callerMemberData?.isHidden ?? false,
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
  const showHidden = isTruthyQueryFlag(req.query.showHidden);
  const showArchived = isTruthyQueryFlag(req.query.showArchived);
  try {
    // If userAddress is provided, verify the caller is requesting their own teams
    if (userAddress) {
      if (userAddress !== callerAddress) {
        return errorResponse(403, 'Unauthorized', res);
      }

      const memberFilter = { memberAddress: callerAddress };
      // Union of list slices; each branch is scoped so hidden vs archived toggles compose.
      // - Default: active (non-archived) teams the member has not hidden.
      // - showHidden: also active teams the member has hidden; if archived is off, also
      //   archived teams that are still hidden (archived+visible stay off until Archived on).
      // - showArchived: archived teams; if Hidden is off, only those the member still lists
      //   as visible (isHidden false), so archived+hidden does not leak into "Archived" alone.
      const memberTeamsWhere = {
        OR: [
          {
            isArchived: false,
            memberTeamsData: {
              some: {
                ...memberFilter,
                isHidden: false,
              },
            },
          },
          ...(showHidden
            ? [
                {
                  isArchived: false,
                  memberTeamsData: {
                    some: {
                      ...memberFilter,
                      isHidden: true,
                    },
                  },
                },
              ]
            : []),
          ...(showArchived
            ? [
                {
                  isArchived: true,
                  memberTeamsData: {
                    some: {
                      ...memberFilter,
                      ...(showHidden ? {} : { isHidden: false }),
                    },
                  },
                },
              ]
            : []),
          ...(showHidden && !showArchived
            ? [
                {
                  isArchived: true,
                  memberTeamsData: {
                    some: {
                      ...memberFilter,
                      isHidden: true,
                    },
                  },
                },
              ]
            : []),
        ],
      };

      const memberTeams = await prisma.team.findMany({
        where: memberTeamsWhere,
        include: {
          _count: {
            select: {
              members: true,
            },
          },
          // The list card renders an initials-only avatar stack, so name +
          // address is all it needs. Deliberately no imageUrl: resolving those
          // means one storage presign per member per team.
          members: {
            select: {
              address: true,
              name: true,
            },
          },
          ...currentOfficerWithContractsInclude,
        },
      });

      const visibilityRows = await prisma.memberTeamsData.findMany({
        where: {
          memberAddress: callerAddress,
          teamId: { in: memberTeams.map((team) => team.id) },
        },
        select: { teamId: true, isHidden: true },
      });

      const hiddenByTeamId = new Map(visibilityRows.map((row) => [row.teamId, row.isHidden]));

      const callerWageByTeamId = await findCallerWagesByTeamId(
        callerAddress,
        memberTeams.map((team) => team.id)
      );

      return res.status(200).json(
        memberTeams.map((team) => ({
          ...withCurrentOfficerAndContracts(team),
          isHidden: hiddenByTeamId.get(team.id) ?? false,
          isArchived: team.isArchived ?? false,
          callerWage: callerWageByTeamId.get(team.id) ?? null,
        }))
      );
    }

    // No userAddress provided - return all teams
    const allTeamsWhere = showArchived ? {} : { isArchived: false };

    const allTeams = await prisma.team.findMany({
      where: allTeamsWhere,
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          select: {
            address: true,
            name: true,
          },
        },
        ...currentOfficerWithContractsInclude,
      },
    });

    const callerWageByTeamId = await findCallerWagesByTeamId(
      callerAddress,
      allTeams.map((team) => team.id)
    );

    res.status(200).json(
      allTeams.map((team) => ({
        ...withCurrentOfficerAndContracts(team),
        isHidden: false,
        isArchived: team.isArchived ?? false,
        callerWage: callerWageByTeamId.get(team.id) ?? null,
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

// Update team

const updateTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, isArchived, isHidden } = req.body;
  const callerAddress = String(req.address);
  const teamId = Number(id);

  try {
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { address: true },
        },
      },
    });

    if (!existingTeam) {
      return errorResponse(404, 'Team not found', res);
    }

    const isOwner = existingTeam.ownerAddress === callerAddress;
    const isMember = existingTeam.members.some((member) => member.address === callerAddress);

    if (!isMember) {
      return errorResponse(403, 'Unauthorized: Caller is not a member of the team', res);
    }

    if (existingTeam.isArchived) {
      const allowedUnarchive =
        isArchived === false &&
        name === undefined &&
        description === undefined &&
        isHidden === undefined;
      const allowedVisibility =
        isHidden !== undefined &&
        name === undefined &&
        description === undefined &&
        isArchived === undefined;
      if (!allowedUnarchive && !allowedVisibility) {
        return errorResponse(409, 'Team is archived — unarchive to modify', res);
      }
    }

    if ((name !== undefined || description !== undefined) && !isOwner) {
      return errorResponse(403, 'Unauthorized: Only team owner can update metadata', res);
    }

    if (isArchived !== undefined && !isOwner) {
      return errorResponse(
        403,
        'Unauthorized: Only team owner can archive/unarchive the team',
        res
      );
    }

    if (
      name === undefined &&
      description === undefined &&
      isArchived === undefined &&
      isHidden === undefined
    ) {
      return errorResponse(400, 'No fields to update', res);
    }

    const teamU = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isArchived !== undefined ? { isArchived: Boolean(isArchived) } : {}),
        ...(isHidden !== undefined
          ? {
              memberTeamsData: {
                updateMany: {
                  where: {
                    teamId,
                    memberAddress: callerAddress,
                  },
                  data: {
                    isHidden: Boolean(isHidden),
                  },
                },
              },
            }
          : {}),
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

    const callerMemberData = await prisma.memberTeamsData.findUnique({
      where: {
        memberAddress_teamId: {
          memberAddress: callerAddress,
          teamId,
        },
      },
      select: { isHidden: true },
    });

    res.status(200).json({
      ...withCurrentOfficerAndContracts(teamU),
      isHidden: callerMemberData?.isHidden ?? false,
    });
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
  try {
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

export { addTeam, deleteTeam, getAllTeams, getTeam, updateTeam };
