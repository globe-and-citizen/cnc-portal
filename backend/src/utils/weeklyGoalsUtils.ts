import { prisma } from '.';

export const WEEKLY_GOALS_REQUIRED_MESSAGE =
  'Submit your weekly goals for this week before submitting a claim.';

export const WEEKLY_GOALS_REQUIRED_FOR_EDIT_MESSAGE =
  'Submit your weekly goals for this week before editing a claim.';

export const WEEKLY_GOALS_CANNOT_BE_CLEARED_MESSAGE =
  'Weekly goals cannot be cleared once hours are submitted for this week.';

/** Goals count only when they hold something other than whitespace. */
export const hasWeeklyGoals = (weeklyGoals: string | null | undefined): boolean =>
  Boolean(weeklyGoals?.trim());

/** Whether the team owner has made weekly goals mandatory before any hours. */
export async function isWeeklyGoalsRequired(teamId: number): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { requireWeeklyGoals: true },
  });
  return team?.requireWeeklyGoals ?? false;
}

/**
 * Whether saving these goals would blank out a week that already holds hours
 * while the team requires goals — the loophole of setting goals, submitting
 * hours, then clearing the goals.
 */
export async function clearsRequiredGoalsOfSubmittedWeek(
  weeklyClaimId: number,
  teamId: number,
  weeklyGoals: string
): Promise<boolean> {
  if (hasWeeklyGoals(weeklyGoals) || !(await isWeeklyGoalsRequired(teamId))) return false;
  const submittedClaims = await prisma.claim.count({ where: { weeklyClaimId } });
  return submittedClaims > 0;
}
