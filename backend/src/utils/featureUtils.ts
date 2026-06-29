import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import { prisma } from './dependenciesUtil';
import type { FeatureStatus } from '../validation/featureValidation';

dayjs.extend(utc);
dayjs.extend(isoWeek);

/** Maximum number of days in the past a claim can be submitted for when restricted. */
export const SUBMIT_RESTRICTION_MAX_DAYS_BACK = 4;

/**
 * The SUBMIT_RESTRICTION feature is active (restriction enforced) when the
 * effective status is `enabled` or when nothing is configured (`null`).
 * `disabled` and `beta` leave submission free.
 */
export function isSubmitRestricted(status: FeatureStatus | null): boolean {
  return status === null || status === 'enabled';
}

/**
 * When the restriction is active, a claim's `dayWorked` is only allowed within
 * the current ISO week and at most SUBMIT_RESTRICTION_MAX_DAYS_BACK days in the
 * past (no future days). Mirrors the calendar guard in the app
 * (`useClaimForm.ts` `isDateDisabledFn`).
 */
export function isDayWithinSubmitWindow(dayWorked: Date, now: Date = new Date()): boolean {
  const d = dayjs.utc(dayWorked).startOf('day');
  const today = dayjs.utc(now).startOf('day');

  const currentWeekStart = today.startOf('isoWeek');
  const currentWeekEnd = today.endOf('isoWeek');
  if (d.isBefore(currentWeekStart, 'day') || d.isAfter(currentWeekEnd, 'day')) return false;

  const daysDiff = today.diff(d, 'day');
  return daysDiff >= 0 && daysDiff <= SUBMIT_RESTRICTION_MAX_DAYS_BACK;
}

export async function findAllFeatures() {
  return await prisma.globalSetting.findMany({
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
}

export async function findFeatureByName(functionName: string) {
  return await prisma.globalSetting.findUnique({
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
}

export async function insertFeature(functionName: string, status: FeatureStatus) {
  return await prisma.globalSetting.create({
    data: {
      functionName,
      status,
    },
  });
}

export async function patchFeature(functionName: string, status: FeatureStatus) {
  return await prisma.globalSetting.update({
    where: { functionName: functionName },
    data: { status },
  });
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
