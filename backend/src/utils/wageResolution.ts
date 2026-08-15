import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import { prisma } from './dependenciesUtil';

dayjs.extend(utc);
dayjs.extend(isoWeek);

type ChainedWage = { id: number; effectiveFrom: Date | null; createdAt: Date };

/**
 * The date a wage started (or will start) being operative.
 *
 * `effectiveFrom` is set when a change is deferred to a future Monday.  Wages
 * created before that column existed — and the very first wage of a member —
 * carry `null` and took effect the moment they were created.
 */
function effectiveAt(wage: ChainedWage): Date {
  return wage.effectiveFrom ?? wage.createdAt;
}

/**
 * Resolve the wage that was operative for a member during a given ISO week.
 *
 * The week worked determines the rate, never the date the claim is entered.
 * A member catching up on a forgotten week is therefore paid — and capped — at
 * the terms that were in force back then, and their claim lands on that week's
 * existing WeeklyClaim instead of opening a second one under a newer wage
 * (issue #2479).
 *
 * `weekStart` must be a Monday 00:00 UTC, matching how WeeklyClaim rows are
 * keyed.  Wage changes are always anchored to a Monday, so exactly one wage
 * covers any given week.
 *
 * When the week predates the member's first wage the earliest wage of the
 * chain is returned rather than nothing: on legacy rows `createdAt` is a
 * technical timestamp, not a business start date, so rejecting would break
 * historical weeks that were legitimately claimed.
 */
export function pickWageForWeek<T extends ChainedWage>(wages: T[], weekStart: Date): T | null {
  if (wages.length === 0) return null;

  const operative = wages.filter((wage) => effectiveAt(wage) <= weekStart);

  // Nothing had started yet: fall back to the earliest link rather than
  // returning nothing (see the note on this function's async counterpart).
  if (operative.length === 0) {
    return wages.reduce((earliest, wage) => (wage.id < earliest.id ? wage : earliest));
  }

  // Ties are broken by id, which increases along the chain, so a wage created
  // later always wins over one that shares its effective date.
  return operative.reduce((latest, wage) =>
    effectiveAt(wage) > effectiveAt(latest) ||
    (effectiveAt(wage).getTime() === effectiveAt(latest).getTime() && wage.id > latest.id)
      ? wage
      : latest
  );
}

export async function resolveWageForWeek(teamId: number, userAddress: string, weekStart: Date) {
  // Chains are a handful of rows at most, and ids increase along the chain
  // because each link is appended after the previous one.
  const wages = await prisma.wage.findMany({
    where: { teamId, userAddress },
    orderBy: { id: 'asc' },
  });

  return pickWageForWeek(wages, weekStart);
}

/**
 * Start of the ISO week (Monday 00:00 UTC) containing `now` — the week whose
 * wage is currently operative.
 */
export function currentWeekStart(now?: Date): Date {
  return dayjs
    .utc(now ?? new Date())
    .startOf('isoWeek')
    .toDate();
}

/**
 * Split a member's wage chain into the wage in force this week and the change
 * queued behind it, using the same rule the claim engine applies.
 *
 * Deriving both from `pickWageForWeek` is what keeps the screen and the server
 * in agreement. Reading the chain's leaf directly instead looks equivalent but
 * is not: rows predating `effectiveFrom` carry a mid-week `createdAt`, so the
 * leaf can already be displayed as current while claims for this week are still
 * being priced on its predecessor.
 */
export function splitCurrentAndScheduled<T extends ChainedWage>(wages: T[], now?: Date) {
  const reference = now ?? new Date();
  const current = pickWageForWeek(wages, currentWeekStart(reference));

  if (!current) return { current: null, scheduled: null };

  const scheduled =
    wages.find((wage) => wage.id !== current.id && isScheduledWage(wage, reference)) ?? null;

  return { current, scheduled };
}

/**
 * Resolve the wage operative right now — the leaf of the chain unless a change
 * is scheduled, in which case the predecessor is still the one that applies.
 */
export async function resolveCurrentWage(teamId: number, userAddress: string, now?: Date) {
  const reference = now ?? new Date();
  const currentWeekStart = dayjs.utc(reference).startOf('isoWeek').toDate();

  return resolveWageForWeek(teamId, userAddress, currentWeekStart);
}

/**
 * Returns the start of the next ISO week (Monday 00:00 UTC).
 *
 * Every wage change lands here, so a wage boundary never falls in the middle of
 * a week and one week always maps to exactly one wage.
 */
export function nextMondayUtc(now?: Date): Date {
  const reference = now ?? new Date();
  return dayjs.utc(reference).add(1, 'week').startOf('isoWeek').toDate();
}

/**
 * Is this wage scheduled but not yet operative?
 */
export function isScheduledWage(
  wage: { effectiveFrom: Date | null } | null | undefined,
  now?: Date
): boolean {
  if (!wage?.effectiveFrom) return false;
  return wage.effectiveFrom > (now ?? new Date());
}

/**
 * Has the member already opened the given week?
 *
 * "Opened" means a `WeeklyClaim` row exists for that member and week — whether
 * it holds daily claims or only weekly goals. Goals count: a goals-only row is
 * keyed `[wageId, weekStart]` like any other, so letting a wage change land on
 * a week that already carries one would split that week in two exactly as
 * claims would.
 */
export async function isWeekOpen(
  teamId: number,
  userAddress: string,
  weekStart: Date
): Promise<boolean> {
  const opened = await prisma.weeklyClaim.count({
    where: { teamId, memberAddress: userAddress, weekStart },
  });

  return opened > 0;
}

/**
 * The date a wage change saved now takes effect on.
 *
 * A week the member has already opened keeps the wage it was opened with, so
 * the change is anchored to next Monday. A week nobody has touched yet takes
 * the change whole, from its own Monday: days already worked but not yet
 * submitted are then paid at the new rate. That is the trade-off the owner
 * makes by not waiting for their members to submit, and it is deliberate.
 *
 * Both branches return a Monday. That is what keeps a wage boundary and a week
 * boundary the same instant, so exactly one wage still covers any week and two
 * `WeeklyClaim` rows for one week remain impossible.
 *
 * Returning "now" for the immediate case would be wrong: resolution compares
 * the effective date against the *start* of the week, so a mid-week timestamp
 * would exclude the new wage from the very week it is meant to apply to.
 */
export function effectiveFromForChange(weekIsOpen: boolean, now?: Date): Date {
  return weekIsOpen ? nextMondayUtc(now) : currentWeekStart(now);
}

/**
 * Members of a team who have already opened the current week, in one query.
 *
 * Used to tell the owner, per member, when a change would take effect, without
 * issuing a query per row.
 */
export async function membersWithOpenWeek(teamId: number, now?: Date): Promise<Set<string>> {
  const rows = await prisma.weeklyClaim.findMany({
    where: { teamId, weekStart: currentWeekStart(now) },
    select: { memberAddress: true },
    distinct: ['memberAddress'],
  });

  return new Set(rows.map((row) => row.memberAddress));
}
