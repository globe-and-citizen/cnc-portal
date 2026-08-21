import dayjs from 'dayjs'
import { formatDate, formatTimeOfDay } from '@/utils/format'
import type {
  VestingInfo,
  VestingSchedule,
  VestingScheduleState,
  VestingTotals,
  VestingTuple
} from '@/types/vesting'

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

export function buildVestingSchedules(
  tuples: unknown[],
  nowSeconds = Math.floor(Date.now() / 1000)
): VestingSchedule[] {
  return tuples.filter(isVestingTuple).flatMap(([members, indices, infos]) =>
    members.flatMap((member, position) => {
      const info = infos[position]
      if (!info) return []
      return [buildVestingSchedule(member, indices[position] ?? BigInt(position), info, nowSeconds)]
    })
  )
}

export function summarizeVestingSchedules(schedules: VestingSchedule[]): VestingTotals {
  return schedules.reduce<VestingTotals>(
    (totals, schedule) => ({
      promised: totals.promised + schedule.totalAmount,
      vested: totals.vested + schedule.vestedAmount,
      claimable: totals.claimable + schedule.claimableAmount,
      released: totals.released + schedule.releasedAmount
    }),
    { promised: 0n, vested: 0n, claimable: 0n, released: 0n }
  )
}

function buildVestingSchedule(
  member: string,
  index: bigint,
  info: VestingInfo,
  nowSeconds: number
): VestingSchedule {
  const start = Number(info.start)
  const duration = Number(info.duration)
  const cliffEnd = start + Number(info.cliff)
  const end = start + duration
  const totalAmount = BigInt(info.totalAmount)
  const releasedAmount = BigInt(info.released)
  const vestedAmount = calculateVestedAmount(info, nowSeconds)
  const claimableAmount = maxBigInt(vestedAmount - releasedAmount, 0n)
  const unvestedAmount = maxBigInt(totalAmount - vestedAmount, 0n)
  const progress = totalAmount === 0n ? 0 : Number((vestedAmount * 10_000n) / totalAmount) / 100

  return {
    member,
    index,
    start,
    end,
    cliffEnd,
    totalAmount,
    vestedAmount,
    claimableAmount,
    releasedAmount,
    unvestedAmount,
    active: info.active,
    progress,
    state: getVestingScheduleState(info, nowSeconds, vestedAmount, claimableAmount)
  }
}

function calculateVestedAmount(info: VestingInfo, nowSeconds: number): bigint {
  const total = BigInt(info.totalAmount)
  const released = BigInt(info.released)
  if (!info.active) return released

  const start = Number(info.start)
  const duration = Number(info.duration)
  const cliffEnd = start + Number(info.cliff)
  if (nowSeconds < cliffEnd) return 0n
  if (duration <= 0 || nowSeconds >= start + duration) return total
  if (nowSeconds <= start) return 0n

  return (total * BigInt(nowSeconds - start)) / BigInt(duration)
}

function getVestingScheduleState(
  info: VestingInfo,
  nowSeconds: number,
  vestedAmount: bigint,
  claimableAmount: bigint
): VestingScheduleState {
  const start = Number(info.start)
  const end = start + Number(info.duration)
  if (!info.active) return 'cancelled'
  if (BigInt(info.released) >= BigInt(info.totalAmount)) return 'completed'
  if (nowSeconds < start) return 'upcoming'
  if (nowSeconds < start + Number(info.cliff)) return 'cliff_locked'
  if (nowSeconds >= end && vestedAmount > 0n) return 'fully_vested'
  if (claimableAmount > 0n) return 'claimable'
  return 'accruing'
}

function isVestingTuple(value: unknown): value is VestingTuple {
  if (!Array.isArray(value) || value.length !== 3) return false
  return value.every(Array.isArray)
}

function maxBigInt(value: bigint, minimum: bigint): bigint {
  return value > minimum ? value : minimum
}
