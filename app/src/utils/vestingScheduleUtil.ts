import dayjs from 'dayjs'
import { formatDate, formatTimeOfDay } from '@/utils/format'

export const VESTING_MINUTE_MS = 60_000

const CALENDAR_UNITS: Array<{
  unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute'
  label: string
}> = [
  { unit: 'year', label: 'year' },
  { unit: 'month', label: 'month' },
  { unit: 'week', label: 'week' },
  { unit: 'day', label: 'day' },
  { unit: 'hour', label: 'hour' },
  { unit: 'minute', label: 'minute' }
]

/** Keep vesting boundaries on the exact precision the form promises. */
export function normalizeVestingMinute(value: Date): Date {
  const normalized = new Date(value)
  normalized.setSeconds(0, 0)
  return normalized
}

/** Default a newly-opened form to the next selectable minute. */
export function nextVestingMinute(value = new Date()): Date {
  const normalized = normalizeVestingMinute(value)
  if (normalized.getTime() < value.getTime()) {
    normalized.setMinutes(normalized.getMinutes() + 1)
  }
  return normalized
}

/** Calendar-aware preset arithmetic, preserving the selected local time. */
export function addVestingMonths(value: Date, months: number): Date {
  return normalizeVestingMinute(dayjs(value).add(months, 'month').toDate())
}

export function vestingMinutesBetween(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0
  return Math.round((end.getTime() - start.getTime()) / VESTING_MINUTE_MS)
}

/** Human calendar duration anchored to the actual vesting boundaries. */
export function formatVestingDuration(start: Date | null, end: Date | null): string {
  if (!start || !end || end <= start) return '—'

  let cursor = dayjs(start)
  const target = dayjs(end)
  const parts: string[] = []

  for (const { unit, label } of CALENDAR_UNITS) {
    const amount = target.diff(cursor, unit)
    if (amount > 0) {
      parts.push(`${amount} ${label}${amount === 1 ? '' : 's'}`)
      cursor = cursor.add(amount, unit)
    }
  }

  return parts.join(', ') || '0 minutes'
}

/** Local date and minute, composed from the canonical date formatters. */
export function formatVestingBoundary(value: Date | null): string {
  if (!value) return '—'
  return `${formatDate(value)} · ${formatTimeOfDay(value)}`
}

/** Amount accrued at the cliff under the contract's linear-from-start schedule. */
export function vestingAmountAtCliff(
  totalAmount: string,
  start: Date | null,
  cliffEnd: Date | null,
  end: Date | null
): number | null {
  if (!start || !cliffEnd || !end || end <= start || cliffEnd <= start) return null
  const amount = Number(totalAmount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const elapsed = Math.min(cliffEnd.getTime() - start.getTime(), end.getTime() - start.getTime())
  return amount * (elapsed / (end.getTime() - start.getTime()))
}
