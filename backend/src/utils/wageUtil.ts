/**
 * Format a total number of minutes as a human-readable duration string.
 * Canonical implementation — also used in app/src/utils/wageUtil.ts.
 * Keep both in sync, or extract to a shared package when one is set up.
 */
export const formatMinutesAsDuration = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
};
