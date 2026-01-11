import { prisma } from './dependenciesUtil';
import type { FeatureStatus } from '../validation/featureValidation';

export async function findAllFeatures() {
  const features = await prisma.globalSetting.findMany({
    orderBy: { functionName: 'asc' },
    include: {
      teamFunctionOverrides: {
        take: 10,
        include: {
          team: true,
        },
        orderBy: {
          id: 'desc',
        },
      },
    },
  });

  return features.map((feature) => ({
    ...feature,
    overridesCount: feature.teamFunctionOverrides.length,
  }));
}

export async function findFeatureByName(functionName: string) {
  const feature = await prisma.globalSetting.findUnique({
    where: { functionName: functionName },
    include: {
      teamFunctionOverrides: {
        take: 100,
        include: {
          team: true,
        },
        orderBy: {
          id: 'asc',
        },
      },
    },
  });

  if (!feature) return null;
  return feature
}

export async function insertFeature(functionName: string, status: FeatureStatus) {
  const feature = await prisma.globalSetting.create({
    data: {
      functionName,
      status,
    },
  });

  return feature;
}

export async function patchFeature(functionName: string, status: FeatureStatus) {
  const feature = await prisma.globalSetting.update({
    where: { functionName: functionName },
    data: { status },
  });

  return feature;
}

export async function removeFeature(functionName: string): Promise<boolean> {
  try {
    await prisma.teamFunctionOverride.deleteMany({ where: { functionName } });
    await prisma.globalSetting.delete({ where: { functionName: functionName } });
    return true;
  } catch {
    return false;
  }
}

export async function featureExists(functionName: string): Promise<boolean> {
  const feature = await prisma.globalSetting.findUnique({
    where: { functionName: functionName },
    select: { functionName: true },
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
    include: { team: true },
  });
  return override;
}

export async function patchOverride(functionName: string, teamId: number, status: FeatureStatus) {
  const override = await prisma.teamFunctionOverride.update({
    where: { unique_team_function: { teamId, functionName } },
    data: { status },
    include: { team: true },
  });
  return override;
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
    where: { functionName: functionName },
    select: { status: true },
  });

  return (globalSetting?.status as FeatureStatus) ?? null;
}
