import dayjs from 'dayjs'
import { isAddress, parseUnits, type Address } from 'viem'
import { z } from 'zod'
import { combineDayAndTime } from '@/utils/dayUtils'
import { formatDate, formatTimeOfDay } from '@/utils/format'
import type {
  VestingCreation,
  VestingInfo,
  VestingSchedule,
  VestingScheduleState,
  VestingTotals,
  VestingTuple
} from '@/types/vesting'
import { VESTING_TOKEN_DECIMALS } from '@/types/vesting'

const VESTING_MINUTE_MS = 60_000
const ONE_MINUTE_MS = VESTING_MINUTE_MS

export const vestingCreationSchema = z
  .object({
    memberAddress: z.string().refine((value) => isAddress(value, { strict: false }), {
      message: 'Choose a valid team member.'
    }),
    totalAmount: z
      .string()
      .trim()
      .min(1, 'Enter the total number of shares.')
      .regex(/^\d+(\.\d{1,6})?$/, 'Use a positive amount with up to 6 decimals.')
      .refine((value) => Number(value) > 0, 'Amount must be greater than 0.'),
    startAt: z.date().nullable(),
    endAt: z.date().nullable(),
    cliffEndAt: z.date().nullable()
  })
  .superRefine((value, context) => {
    if (!value.startAt) {
      context.addIssue({
        code: 'custom',
        path: ['startAt'],
        message: 'Choose a start date and time.'
      })
    }
    if (!value.endAt) {
      context.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'Choose an end date and time.'
      })
    }
    if (!value.cliffEndAt) {
      context.addIssue({
        code: 'custom',
        path: ['cliffEndAt'],
        message: 'Choose when the cliff ends.'
      })
    }
    if (!value.startAt || !value.endAt || !value.cliffEndAt) return

    if (value.endAt.getTime() - value.startAt.getTime() < ONE_MINUTE_MS) {
      context.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'End must be at least one minute after start.'
      })
    }
    if (value.cliffEndAt < value.startAt || value.cliffEndAt > value.endAt) {
      context.addIssue({
        code: 'custom',
        path: ['cliffEndAt'],
        message: 'Cliff end must be between the start and end.'
      })
    }
  })

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
function normalizeVestingMinute(value: Date): Date {
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

export function resolveVestingBoundary(day: Date | null, time: string): Date | null {
  if (!day || !time) return null
  return combineDayAndTime(day, time)
}

export function resolveVestingTokenSymbol(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'SHARES'
}

export function buildVestingCreation(input: {
  member: VestingCreation['member']
  totalAmount: string
  tokenSymbol: string
  startAt: Date | null
  endAt: Date | null
  cliffEndAt: Date | null
  noCliff: boolean
}): VestingCreation | null {
  if (!input.startAt || !input.endAt || !input.cliffEndAt) return null

  return {
    member: input.member,
    totalAmount: input.totalAmount,
    tokenSymbol: input.tokenSymbol,
    startAt: input.startAt,
    endAt: input.endAt,
    cliffEndAt: input.cliffEndAt,
    durationMinutes: vestingMinutesBetween(input.startAt, input.endAt),
    cliffMinutes: input.noCliff ? 0 : vestingMinutesBetween(input.startAt, input.cliffEndAt),
    noCliff: input.noCliff
  }
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
): bigint | null {
  if (!start || !cliffEnd || !end || end <= start || cliffEnd <= start) return null

  let amount: bigint
  try {
    amount = parseUnits(totalAmount, VESTING_TOKEN_DECIMALS)
  } catch {
    return null
  }
  if (amount <= 0n) return null

  const elapsed = Math.min(cliffEnd.getTime() - start.getTime(), end.getTime() - start.getTime())
  return (amount * BigInt(elapsed)) / BigInt(end.getTime() - start.getTime())
}

/** Build the exact base-unit arguments expected by `Vesting.addVesting`. */
export function buildAddVestingArgs(
  data: VestingCreation
): readonly [Address, bigint, bigint, bigint, bigint] {
  return [
    data.member.address as Address,
    BigInt(Math.floor(data.startAt.getTime() / 1000)),
    BigInt(data.durationMinutes * 60),
    BigInt(data.cliffMinutes * 60),
    parseUnits(data.totalAmount, VESTING_TOKEN_DECIMALS)
  ]
}

export function buildVestingSchedules(
  tuples: readonly unknown[],
  nowSeconds = Math.floor(Date.now() / 1000)
): VestingSchedule[] {
  return tuples.flatMap((value) => {
    const tuple = parseVestingTuple(value)
    if (!tuple) return []
    const [members, indices, infos] = tuple
    return members.flatMap((member, position) => {
      const index = indices[position]
      const info = infos[position]
      if (index === undefined || !info) return []
      return [buildVestingSchedule(member, index, info, nowSeconds)]
    })
  })
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

function parseVestingTuple(value: unknown): VestingTuple | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  const [members, indices, infos] = value
  if (!Array.isArray(members) || !Array.isArray(indices) || !Array.isArray(infos)) return null
  if (members.length !== indices.length || members.length !== infos.length) return null
  if (!members.every((member) => typeof member === 'string' && isAddress(member))) return null
  if (!indices.every((index) => typeof index === 'bigint')) return null
  if (!infos.every(isVestingInfo)) return null
  return value as unknown as VestingTuple
}

function isVestingInfo(value: unknown): value is VestingInfo {
  if (!value || typeof value !== 'object') return false
  const info = value as Record<string, unknown>
  return (
    typeof info.start === 'bigint' &&
    typeof info.duration === 'bigint' &&
    typeof info.cliff === 'bigint' &&
    typeof info.totalAmount === 'bigint' &&
    typeof info.released === 'bigint' &&
    typeof info.active === 'boolean'
  )
}

function maxBigInt(value: bigint, minimum: bigint): bigint {
  return value > minimum ? value : minimum
}
