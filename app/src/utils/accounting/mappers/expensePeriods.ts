/**
 * Expense-approval period math — mirrors the `ExpenseAccountEIP712` contract's
 * `getPeriod`, so the accounting layer can reconstruct which recurring window a
 * withdrawal falls in. A recurring approval grants a fresh cap each period
 * (Daily / Weekly / Monthly / Custom), so draws in different periods accumulate
 * separately; one-time (and unknown) approvals share a single all-time bucket.
 *
 * Kept pure and separate from the mapper so the window logic stays unit-testable
 * and the mapper reads as bookkeeping, not calendar arithmetic.
 */

/** Approval reset behaviour, matching the contract's `FrequencyType` enum. */
export const FREQUENCY = {
  ONE_TIME: 0,
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY: 3,
  CUSTOM: 4
} as const

const DAY = 86_400
const WEEK = 7 * DAY

/** Start of the Monday (00:00 UTC) of the week containing `ts` — matches the contract. */
function startOfWeekUtc(ts: number): number {
  const d = new Date(ts * 1000)
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
  // JS getUTCDay: 0 Sun … 6 Sat → Monday-based offset (Mon 0 … Sun 6).
  return dayStart - ((d.getUTCDay() + 6) % 7) * DAY
}

/** Calendar months between two timestamps (UTC) — matches the contract's month diff. */
function monthsSince(startDate: number, timestamp: number): number {
  const s = new Date(startDate * 1000)
  const t = new Date(timestamp * 1000)
  return (t.getUTCFullYear() - s.getUTCFullYear()) * 12 + (t.getUTCMonth() - s.getUTCMonth())
}

/** A budget's frequency behaviour, as needed to place a draw in its period. */
export interface PeriodSpec {
  frequencyType: number
  /** Period-anchor time, Unix seconds — the approval's `startDate`. */
  startDate: number
  /** Custom period length in seconds, when `frequencyType === CUSTOM`. */
  customFrequency: number
}

/**
 * The period index a draw at `timestamp` falls in. Draws in the same period share
 * an index (so they accumulate against one cap); a later period gets a higher
 * index (a fresh cap). One-time and unknown frequencies collapse to a single bucket.
 */
export function periodIndex(spec: PeriodSpec, timestamp: number): number {
  if (timestamp < spec.startDate) return 0
  switch (spec.frequencyType) {
    case FREQUENCY.DAILY:
      return Math.floor((timestamp - spec.startDate) / DAY)
    case FREQUENCY.WEEKLY: // Monday-to-Sunday windows
      return Math.floor((startOfWeekUtc(timestamp) - startOfWeekUtc(spec.startDate)) / WEEK)
    case FREQUENCY.MONTHLY: // calendar months
      return monthsSince(spec.startDate, timestamp)
    case FREQUENCY.CUSTOM:
      return spec.customFrequency > 0
        ? Math.floor((timestamp - spec.startDate) / spec.customFrequency)
        : 0
    default: // One-Time and unknown — a single all-time bucket
      return 0
  }
}
