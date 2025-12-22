import { prisma } from './dependenciesUtil';

/**
 * Check if submit restriction is enabled for a specific team.
 *
 * Logic:
 * 1. If team has an override → use override status
 * 2. Otherwise → use global setting
 *
 * @param teamId - The team ID to check
 * @returns true if submit is restricted (current week only), false if unrestricted
 */
export async function isSubmitRestricted(teamId: number): Promise<boolean> {
  const functionName = 'SUBMIT_RESTRICTION';

  // Check for team-specific override first
  const override = await prisma.teamFunctionOverride.findUnique({
    where: {
      unique_team_function: {
        teamId,
        functionName,
      },
    },
  });

  if (override) {
    // Override exists: 'enabled' or 'on' = restricted, 'disabled' or 'off' = unrestricted
    return ['enabled', 'on'].includes(override.status.toLowerCase());
  }

  // No override, check global setting
  const globalSetting = await prisma.globalSetting.findUnique({
    where: {
      fonctionName: functionName,
    },
  });

  if (globalSetting) {
    return globalSetting.isGloballyRestricted;
  }

  // Default: restricted (safe default)
  return true;
}

/**
 * Get the global submit restriction setting
 * @returns The global setting or null if not found
 */
export async function getGlobalSubmitRestriction() {
  const functionName = 'SUBMIT_RESTRICTION';

  const globalSetting = await prisma.globalSetting.findUnique({
    where: {
      fonctionName: functionName,
    },
  });

  return globalSetting;
}

/**
 * Update or create the global submit restriction setting
 * @param isRestricted - Whether submit restriction should be globally enabled
 * @returns The updated/created global setting
 */
export async function setGlobalSubmitRestriction(isRestricted: boolean) {
  const functionName = 'SUBMIT_RESTRICTION';

  const globalSetting = await prisma.globalSetting.upsert({
    where: {
      fonctionName: functionName,
    },
    update: {
      isGloballyRestricted: isRestricted,
      status: isRestricted ? 'enabled' : 'disabled',
    },
    create: {
      fonctionName: functionName,
      status: isRestricted ? 'enabled' : 'disabled',
      isGloballyRestricted: isRestricted,
    },
  });

  return globalSetting;
}

/**
 * Get all team overrides for submit restriction
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated list of team overrides with team info
 */
export async function getTeamOverrides(page: number = 1, pageSize: number = 10) {
  const functionName = 'SUBMIT_RESTRICTION';
  const skip = (page - 1) * pageSize;

  const [overrides, total] = await Promise.all([
    prisma.teamFunctionOverride.findMany({
      where: {
        functionName,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    prisma.teamFunctionOverride.count({
      where: {
        functionName,
      },
    }),
  ]);

  return {
    data: overrides.map((override) => ({
      teamId: override.teamId,
      teamName: override.team.name,
      memberCount: override.team._count.members,
      isRestricted: ['enabled', 'on'].includes(override.status.toLowerCase()),
      status: override.status,
      updatedAt: override.updatedAt,
      createdAt: override.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Create or update a team override for submit restriction
 * @param teamId - The team ID
 * @param isRestricted - Whether the team should be restricted
 * @returns The created/updated override
 */
export async function setTeamOverride(teamId: number, isRestricted: boolean) {
  const functionName = 'SUBMIT_RESTRICTION';

  // Ensure global setting exists first
  await prisma.globalSetting.upsert({
    where: {
      fonctionName: functionName,
    },
    update: {},
    create: {
      fonctionName: functionName,
      status: 'enabled',
      isGloballyRestricted: true,
    },
  });

  const override = await prisma.teamFunctionOverride.upsert({
    where: {
      unique_team_function: {
        teamId,
        functionName,
      },
    },
    update: {
      status: isRestricted ? 'enabled' : 'disabled',
    },
    create: {
      teamId,
      functionName,
      status: isRestricted ? 'enabled' : 'disabled',
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
  });

  return {
    teamId: override.teamId,
    teamName: override.team.name,
    memberCount: override.team._count.members,
    isRestricted: ['enabled', 'on'].includes(override.status.toLowerCase()),
    status: override.status,
    updatedAt: override.updatedAt,
  };
}

/**
 * Delete a team override (team will inherit global setting)
 * @param teamId - The team ID
 * @returns true if deleted, false if not found
 */
export async function deleteTeamOverride(teamId: number): Promise<boolean> {
  const functionName = 'SUBMIT_RESTRICTION';

  try {
    await prisma.teamFunctionOverride.delete({
      where: {
        unique_team_function: {
          teamId,
          functionName,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get teams available for override (teams without existing override)
 * @param search - Optional search term for team name
 * @param limit - Maximum number of results
 * @returns List of teams without override
 */
export async function getAvailableTeamsForOverride(search?: string, limit: number = 50) {
  const functionName = 'SUBMIT_RESTRICTION';

  // Get teams that don't have an override yet
  const teams = await prisma.team.findMany({
    where: {
      name: search
        ? {
            contains: search,
            mode: 'insensitive',
          }
        : undefined,
      teamFunctionOverrides: {
        none: {
          functionName,
        },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
    take: limit,
    orderBy: {
      name: 'asc',
    },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    memberCount: team._count.members,
  }));
}

/**
 * Get complete submit restriction status for dashboard
 * Includes global setting and all overrides
 */
export async function getSubmitRestrictionStatus() {
  const functionName = 'SUBMIT_RESTRICTION';

  const [globalSetting, overridesCount] = await Promise.all([
    prisma.globalSetting.findUnique({
      where: {
        fonctionName: functionName,
      },
    }),
    prisma.teamFunctionOverride.count({
      where: {
        functionName,
      },
    }),
  ]);

  return {
    global: {
      isRestricted: globalSetting?.isGloballyRestricted ?? true,
      status: globalSetting?.status ?? 'enabled',
      updatedAt: globalSetting?.updatedAt ?? null,
    },
    overridesCount,
  };
}
