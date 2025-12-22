import { prisma } from './dependenciesUtil';
import type { FeatureStatus } from '../validation/featureValidation';

/**
 * Get all features (GlobalSettings)
 */
export async function getAllFeatures() {
  const features = await prisma.globalSetting.findMany({
    orderBy: {
      fonctionName: 'asc',
    },
  });

  // Get override counts for each feature
  const overrideCounts = await prisma.teamFunctionOverride.groupBy({
    by: ['functionName'],
    _count: {
      id: true,
    },
  });

  const overrideMap = new Map(overrideCounts.map((o) => [o.functionName, o._count.id]));

  return features.map((feature) => ({
    functionName: feature.fonctionName,
    status: feature.status,
    isGloballyRestricted: feature.isGloballyRestricted,
    overridesCount: overrideMap.get(feature.fonctionName) ?? 0,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  }));
}

/**
 * Get a single feature by functionName
 */
export async function getFeature(functionName: string) {
  const feature = await prisma.globalSetting.findUnique({
    where: {
      fonctionName: functionName,
    },
  });

  if (!feature) {
    return null;
  }

  // Get overrides for this feature
  const overrides = await prisma.teamFunctionOverride.findMany({
    where: {
      functionName,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return {
    functionName: feature.fonctionName,
    status: feature.status,
    isGloballyRestricted: feature.isGloballyRestricted,
    overrides: overrides.map((o) => ({
      teamId: o.teamId,
      teamName: o.team.name,
      status: o.status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    })),
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  };
}

/**
 * Create a new feature
 */
export async function createFeature(functionName: string, status: FeatureStatus) {
  const feature = await prisma.globalSetting.create({
    data: {
      fonctionName: functionName,
      status,
      isGloballyRestricted: status === 'disabled',
    },
  });

  return {
    functionName: feature.fonctionName,
    status: feature.status,
    isGloballyRestricted: feature.isGloballyRestricted,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  };
}

/**
 * Update a feature's status
 */
export async function updateFeature(functionName: string, status: FeatureStatus) {
  const feature = await prisma.globalSetting.update({
    where: {
      fonctionName: functionName,
    },
    data: {
      status,
      isGloballyRestricted: status === 'disabled',
    },
  });

  return {
    functionName: feature.fonctionName,
    status: feature.status,
    isGloballyRestricted: feature.isGloballyRestricted,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  };
}

/**
 * Delete a feature
 */
export async function deleteFeature(functionName: string): Promise<boolean> {
  try {
    // First delete all team overrides for this feature
    await prisma.teamFunctionOverride.deleteMany({
      where: {
        functionName,
      },
    });

    // Then delete the feature itself
    await prisma.globalSetting.delete({
      where: {
        fonctionName: functionName,
      },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a feature exists
 */
export async function featureExists(functionName: string): Promise<boolean> {
  const feature = await prisma.globalSetting.findUnique({
    where: {
      fonctionName: functionName,
    },
  });

  return feature !== null;
}

/**
 * Create a team override for a feature
 */
export async function createTeamOverride(
  functionName: string,
  teamId: number,
  status: FeatureStatus
) {
  const override = await prisma.teamFunctionOverride.create({
    data: {
      functionName,
      teamId,
      status,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    functionName: override.functionName,
    teamId: override.teamId,
    teamName: override.team.name,
    status: override.status,
    createdAt: override.createdAt,
    updatedAt: override.updatedAt,
  };
}

/**
 * Update a team override
 */
export async function updateTeamOverride(
  functionName: string,
  teamId: number,
  status: FeatureStatus
) {
  const override = await prisma.teamFunctionOverride.update({
    where: {
      unique_team_function: {
        teamId,
        functionName,
      },
    },
    data: {
      status,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    functionName: override.functionName,
    teamId: override.teamId,
    teamName: override.team.name,
    status: override.status,
    createdAt: override.createdAt,
    updatedAt: override.updatedAt,
  };
}

/**
 * Delete a team override
 */
export async function deleteTeamOverride(functionName: string, teamId: number): Promise<boolean> {
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
 * Check if a team override exists
 */
export async function teamOverrideExists(functionName: string, teamId: number): Promise<boolean> {
  const override = await prisma.teamFunctionOverride.findUnique({
    where: {
      unique_team_function: {
        teamId,
        functionName,
      },
    },
  });

  return override !== null;
}

/**
 * Check if a team exists
 */
export async function teamExists(teamId: number): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  return team !== null;
}

/**
 * Get the effective status for a team (override or global)
 */
export async function getEffectiveStatus(
  functionName: string,
  teamId: number
): Promise<string | null> {
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
    return override.status;
  }

  // Fallback to global setting
  const globalSetting = await prisma.globalSetting.findUnique({
    where: {
      fonctionName: functionName,
    },
  });

  return globalSetting?.status ?? null;
}
