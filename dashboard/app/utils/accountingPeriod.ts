import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns'

export type AccountingPeriodPreset = 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface AccountingPeriodRange {
  preset: AccountingPeriodPreset
  /** Inclusive lower bound (unix seconds); omitted for all-time. */
  start?: number
  /** Inclusive upper bound (unix seconds). */
  end: number
  /** Human-readable span for UI headers. */
  label: string
  /** True when the period ends within the last 24 hours (live prices / mark-to-market). */
  isCurrent: boolean
}

const PRESET_LABELS: Record<AccountingPeriodPreset, string> = {
  ALL: 'All time',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly'
}

export const ACCOUNTING_PERIOD_PRESET_OPTIONS = (
  Object.entries(PRESET_LABELS) as [AccountingPeriodPreset, string][]
).map(([value, label]) => ({ label, value }))

function parseAnchor(anchorDateStr: string): Date {
  return startOfDay(new Date(`${anchorDateStr}T12:00:00`))
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function capEndAtNow(end: Date, now: Date): Date {
  return end > now ? now : end
}

/** Inclusive Mon–Sun week containing `date` (ISO week, Monday start). */
export function snapDateRangeToWeek(date: Date, now: Date = new Date()): { start: Date, end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = capEndAtNow(endOfWeek(date, { weekStartsOn: 1 }), now)
  return { start, end }
}

export interface BalanceSheetAsOf {
  /** Omit for all-time (include every ledger entry). */
  asOf?: number
  label: string
  isCurrent: boolean
}

/**
 * Resolves a calendar range into the balance-sheet "as of" instant (end of the
 * selected day, capped at now). When no range is given, returns all-time.
 */
export function resolveBalanceSheetAsOf(
  range: { start: Date | null, end: Date | null } | null,
  now: Date = new Date()
): BalanceSheetAsOf {
  const nowEnd = toUnixSeconds(now)

  if (!range?.start && !range?.end) {
    return {
      asOf: undefined,
      label: PRESET_LABELS.ALL,
      isCurrent: true
    }
  }

  const anchorStart = range.start ?? range.end!
  const anchorEnd = range.end ?? range.start!
  const end = capEndAtNow(endOfDay(anchorEnd), now)
  const asOf = toUnixSeconds(end)

  const sameDay = startOfDay(anchorStart).getTime() === startOfDay(anchorEnd).getTime()
  const label = sameDay
    ? format(end, 'MMMM d, yyyy')
    : `${format(startOfDay(anchorStart), 'MMM d')} – ${format(end, 'MMM d, yyyy')}`

  return {
    asOf,
    label,
    isCurrent: asOf >= nowEnd - 24 * 60 * 60
  }
}

function formatRangeLabel(start: Date, end: Date, preset: AccountingPeriodPreset): string {
  if (preset === 'DAILY') {
    return format(start, 'MMMM d, yyyy')
  }
  if (preset === 'YEARLY') {
    return format(start, 'yyyy')
  }
  if (format(start, 'yyyy') === format(end, 'yyyy')) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

/**
 * Resolves preset + anchor calendar day into inclusive unix-second bounds.
 * The anchor picks which day, week, month, or year to analyze (defaults to today).
 */
export function resolveAccountingPeriod(
  preset: AccountingPeriodPreset,
  anchorDateStr: string,
  now: Date = new Date()
): AccountingPeriodRange {
  const nowEnd = toUnixSeconds(now)

  if (preset === 'ALL') {
    return {
      preset,
      end: nowEnd,
      label: PRESET_LABELS.ALL,
      isCurrent: true
    }
  }

  const anchor = parseAnchor(anchorDateStr)

  let start: Date
  let end: Date

  switch (preset) {
    case 'DAILY':
      start = startOfDay(anchor)
      end = endOfDay(anchor)
      break
    case 'WEEKLY':
      start = startOfWeek(anchor, { weekStartsOn: 1 })
      end = endOfWeek(anchor, { weekStartsOn: 1 })
      break
    case 'MONTHLY':
      start = startOfMonth(anchor)
      end = endOfMonth(anchor)
      break
    case 'YEARLY':
      start = startOfYear(anchor)
      end = endOfYear(anchor)
      break
    default:
      start = startOfDay(anchor)
      end = endOfDay(anchor)
  }

  end = capEndAtNow(end, now)
  const startUnix = toUnixSeconds(start)
  const endUnix = toUnixSeconds(end)

  return {
    preset,
    start: startUnix,
    end: endUnix,
    label: formatRangeLabel(start, end, preset),
    isCurrent: endUnix >= nowEnd - 24 * 60 * 60
  }
}
