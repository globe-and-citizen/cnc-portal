import { prisma } from './dependenciesUtil';
import type { FeatureStatus } from '../validation/featureValidation';

/**
 * Derive isGloballyRestricted from status.
 * - 'enabled' means restriction IS active globally
 * - 'disabled' means no restriction
 */
export const isRestrictionActive = (status: FeatureStatus): boolean => status === 'enabled';

/**
 * Map a GlobalSetting record to API response shape.
 */
export const mapFeatureToResponse = (feature: {
  fonctionName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  functionName: feature.fonctionName,
  status: feature.status as FeatureStatus,
  isGloballyRestricted: isRestrictionActive(feature.status as FeatureStatus),
  createdAt: feature.createdAt,
  updatedAt: feature.updatedAt,
});

/**
 * Map a TeamFunctionOverride record to API response shape.
 */
export const mapOverrideToResponse = (override: {
  functionName: string;
  teamId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  team: { id: number; name: string };
}) => ({
  functionName: override.functionName,
  teamId: override.teamId,
  teamName: override.team.name,
  status: override.status as FeatureStatus,
  createdAt: override.createdAt,
  updatedAt: override.updatedAt,
});

export async function findAllFeatures() {
  const features = await prisma.globalSetting.findMany({
    orderBy: { fonctionName: 'asc' },
  });

  const overrideCounts = await prisma.teamFunctionOverride.groupBy({
    by: ['functionName'],
    _count: { id: true },
  });

  const overrideMap = new Map(overrideCounts.map((o) => [o.functionName, o._count.id]));

  return features.map((feature) => ({
    ...mapFeatureToResponse(feature),
    overridesCount: overrideMap.get(feature.fonctionName) ?? 0,
  }));
}

export async function findFeatureByName(functionName: string) {
  const feature = await prisma.globalSetting.findUnique({
    where: { fonctionName: functionName },
    include:{
      teamFunctionOverrides: {
    include: { team: { select: { id: true, name: true } } },
      }
    }
  });
  
  return []

  if (!feature) return null;

  const overrides = await prisma.teamFunctionOverride.findMany({
    where: { functionName },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return {
  //   ...mapFeatureToResponse(feature),
  //   overrides: overrides.map((o) => ({
  //     teamId: o.teamId,
  //     teamName: o.team.name,
  //     status: o.status as FeatureStatus,
  //     createdAt: o.createdAt,
  //     updatedAt: o.updatedAt,
  //   })),
  // };
}

export async function insertFeature(functionName: string, status: FeatureStatus) {
  const feature = await prisma.globalSetting.create({
    data: {
      fonctionName: functionName,
      status,
      isGloballyRestricted: isRestrictionActive(status),
    },
  });

  return mapFeatureToResponse(feature);
}

export async function patchFeature(functionName: string, status: FeatureStatus) {
  const feature = await prisma.globalSetting.update({
    where: { fonctionName: functionName },
    data: {
      status,
      isGloballyRestricted: isRestrictionActive(status),
    },
  });

  return mapFeatureToResponse(feature);
}

export async function removeFeature(functionName: string): Promise<boolean> {
  try {
    await prisma.teamFunctionOverride.deleteMany({ where: { functionName } });
    await prisma.globalSetting.delete({ where: { fonctionName: functionName } });
    return true;
  } catch {
    return false;
  }
}

export async function featureExists(functionName: string): Promise<boolean> {
  const feature = await prisma.globalSetting.findUnique({
    where: { fonctionName: functionName },
    select: { fonctionName: true },
  });
  return feature !== null;
}

export async function teamExists(teamId: number): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  return team !== null;
}

export async function overrideExists(functionName: string, teamId: number): Promise<boolean> {
  const override = await prisma.teamFunctionOverride.findUnique({
    where: { unique_team_function: { teamId, functionName } },
    select: { id: true },
  });
  return override !== null;
}

export async function insertOverride(functionName: string, teamId: number, status: FeatureStatus) {
  const override = await prisma.teamFunctionOverride.create({
    data: { functionName, teamId, status },
    include: { team: { select: { id: true, name: true } } },
  });
  return mapOverrideToResponse(override);
}

export async function patchOverride(functionName: string, teamId: number, status: FeatureStatus) {
  const override = await prisma.teamFunctionOverride.update({
    where: { unique_team_function: { teamId, functionName } },
    data: { status },
    include: { team: { select: { id: true, name: true } } },
  });
  return mapOverrideToResponse(override);
}

export async function removeOverrideRecord(functionName: string, teamId: number): Promise<boolean> {
  try {
    await prisma.teamFunctionOverride.delete({
      where: { unique_team_function: { teamId, functionName } },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the effective status for a team: override first, then global, then null.
 */
export async function getEffectiveStatus(
  functionName: string,
  teamId: number
): Promise<FeatureStatus | null> {
  const override = await prisma.teamFunctionOverride.findUnique({
    where: { unique_team_function: { teamId, functionName } },
    select: { status: true },
  });

  if (override) return override.status as FeatureStatus;

  const globalSetting = await prisma.globalSetting.findUnique({
    where: { fonctionName: functionName },
    select: { status: true },
  });

  return (globalSetting?.status as FeatureStatus) ?? null;
}
