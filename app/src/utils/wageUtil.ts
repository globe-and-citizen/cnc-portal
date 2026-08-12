import type {
  RatePerHour,
  RatePerHourWithEnabled,
  SupportedTokens,
  Wage,
  WeeklyClaim
} from '@/types'
import { parseEther, parseUnits, type Address } from 'viem'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import { formatDate, type DateInput } from '@/utils/format'
import { NETWORK } from '@/constant'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const requiredRateTypes: RatePerHour['type'][] = ['native', 'usdc', 'sher']

/**
 * Daily hours ceiling applied when a wage does not specify one.
 */
export const DEFAULT_MAXIMUM_HOURS_PER_DAY = 8

export const formatMinutesAsDuration = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h ${m}min`
}

/**
 * Ticker shown for a rate. The `native` type is stored generically but has to be
 * displayed as the chain's own symbol — "NATIVE" is a database value, not
 * something a user recognises.
 */
export const rateSymbol = (type: string): string =>
  type === 'native' ? NETWORK.currencySymbol : type.toUpperCase()

/**
 * Summarises a pending wage change for display, e.g.
 * "Changes to SHER 10/h, 20h/wk, 8h/d on Aug 17, 2026".
 *
 * Covers the hour ceilings as well as the rate: a scheduled wage carries its own
 * weekly and daily caps, and showing only the rate hides half of what is about
 * to change.
 *
 * Worded as a replacement — the badge sits next to the wage in force, and
 * "from <date>" alone reads as something being added rather than the current
 * terms being superseded. Symbol precedes the amount to match `RateDotList`,
 * the other place rates are displayed.
 *
 * Returns null when nothing is scheduled, so callers can `v-if` on the result.
 */
export const formatScheduledWageNotice = (scheduledWage?: Wage | null): string | null => {
  if (!scheduledWage?.effectiveFrom) return null

  const effectiveDate = dayjs(scheduledWage.effectiveFrom)
  if (!effectiveDate.isValid()) return null

  const rates = (scheduledWage.ratePerHour ?? [])
    .filter((rate) => rate.amount > 0)
    .map((rate) => `${rateSymbol(rate.type)} ${rate.amount}`)
    .join(' + ')

  const parts = [
    rates ? `${rates}/h` : null,
    scheduledWage.maximumHoursPerWeek ? `${scheduledWage.maximumHoursPerWeek}h/wk` : null,
    scheduledWage.maximumHoursPerDay ? `${scheduledWage.maximumHoursPerDay}h/d` : null
  ].filter(Boolean)

  const day = formatDate(effectiveDate)

  return parts.length ? `Changes to ${parts.join(', ')} on ${day}` : `Wage changes on ${day}`
}

/**
 * The Monday a change made now would take effect on, formatted for display.
 * Mirrors the server's `nextMondayUtc`, which anchors every wage change to the
 * start of the next ISO week so a wage boundary never falls mid-week.
 */
export const nextEffectiveDateLabel = (now: DateInput = new Date()): string =>
  formatDate(dayjs(now).utc().add(1, 'week').startOf('isoWeek'))

/**
 * Milliseconds until a scheduled wage takes effect, or null when there is
 * nothing to wait for. Used to refresh the UI the moment the change lands
 * instead of polling.
 */
export const msUntilWageEffective = (
  scheduledWage?: Wage | null,
  now: number = Date.now()
): number | null => {
  if (!scheduledWage?.effectiveFrom) return null

  const effectiveAt = new Date(scheduledWage.effectiveFrom).getTime()
  if (Number.isNaN(effectiveAt)) return null

  const delay = effectiveAt - now
  return delay > 0 ? delay : null
}

export const normalizeRatePerHour = (rates?: RatePerHour[] | null): RatePerHourWithEnabled[] => {
  return requiredRateTypes.map((type) => {
    const existingRate = rates?.find((rate) => rate.type === type)

    return {
      type,
      amount: existingRate?.amount ?? 0,
      enabled: existingRate ? existingRate.amount > 0 : false
    }
  })
}

export const buildRatePayload = (rates: RatePerHourWithEnabled[]): RatePerHour[] => {
  return rates
    .filter((rate) => rate.enabled && Number(rate.amount) > 0)
    .map((rate) => ({ type: rate.type, amount: Number(rate.amount) }))
}

export interface ClaimRateWithTotals {
  type: RatePerHour['type']
  hourlyRate: bigint
  totalAmount: bigint
}

interface WageClaimPayload {
  minutesWorked: number
  employeeAddress: Address
  date: bigint
  wages: Array<{
    hourlyRate: bigint
    tokenAddress: Address
  }>
}

const parseRateAmount = (amount: number, type: RatePerHour['type']) => {
  return type === 'native' ? parseEther(`${amount}`) : parseUnits(`${amount}`, 6)
}

const getRegularAndOvertimeHours = (
  totalMinutesWorked: number,
  maximumHoursPerWeek?: number | null
) => {
  const safeMinutes = Math.max(0, Math.floor(totalMinutesWorked))
  const hasValidWeeklyLimit =
    typeof maximumHoursPerWeek === 'number' &&
    Number.isFinite(maximumHoursPerWeek) &&
    maximumHoursPerWeek > 0

  const maxRegularMinutes = hasValidWeeklyLimit
    ? Math.max(0, Math.floor((maximumHoursPerWeek as number) * 60))
    : safeMinutes

  const regularMinutes = Math.min(safeMinutes, maxRegularMinutes)
  const overtimeMinutes = Math.max(0, safeMinutes - regularMinutes)

  return {
    regularMinutes,
    overtimeMinutes,
    totalMinutes: safeMinutes
  }
}

export const buildClaimRatesWithOvertime = ({
  totalMinutesWorked,
  maximumHoursPerWeek,
  ratePerHour,
  overtimeRatePerHour
}: {
  totalMinutesWorked: number
  maximumHoursPerWeek?: number | null
  ratePerHour: RatePerHour[]
  overtimeRatePerHour?: RatePerHour[] | null
}): ClaimRateWithTotals[] => {
  const { regularMinutes, overtimeMinutes, totalMinutes } = getRegularAndOvertimeHours(
    totalMinutesWorked,
    maximumHoursPerWeek
  )

  return ratePerHour.map((baseRate) => {
    const baseRateWei = parseRateAmount(baseRate.amount, baseRate.type)
    const overtimeRate = overtimeRatePerHour?.find((rate) => rate.type === baseRate.type)
    const overtimeRateWei = overtimeRate
      ? parseRateAmount(overtimeRate.amount, baseRate.type)
      : baseRateWei

    // totalAmount expected payout:
    // (baseHourlyRate * regularMinutes + overtimeHourlyRate * overtimeMinutes) / 60
    const totalAmount =
      (baseRateWei * BigInt(regularMinutes) + overtimeRateWei * BigInt(overtimeMinutes)) / 60n

    // Effective hourly rate for on-chain formula:
    // amountToPay = minutesWorked * hourlyRate / 60
    const hourlyRate = totalMinutes > 0 ? (totalAmount * 60n) / BigInt(totalMinutes) : baseRateWei

    return {
      type: baseRate.type,
      hourlyRate,
      totalAmount
    }
  })
}

/**
 * Splits total minutes worked into regular vs overtime minutes for a given wage.
 * Overtime only applies when the wage actually defines an overtime rate; otherwise
 * every minute is treated as regular time.
 */
export const splitClaimMinutes = (
  totalMinutesWorked: number,
  wage?: Pick<Wage, 'overtimeRatePerHour' | 'maximumHoursPerWeek'> | null
) => {
  const hasOvertime =
    Array.isArray(wage?.overtimeRatePerHour) && (wage?.overtimeRatePerHour.length ?? 0) > 0
  return getRegularAndOvertimeHours(
    totalMinutesWorked,
    hasOvertime ? wage?.maximumHoursPerWeek : null
  )
}

/**
 * Computes the per-token payout for a claim, combining regular and overtime pay:
 * regularRate * regularHours + overtimeRate * overtimeHours.
 *
 * Shared by the company payroll table and the member payroll recap so both views
 * agree on the total (see issue: company payroll ignored overtime).
 */
export const computeClaimTokenAmounts = (
  totalMinutesWorked: number,
  wage?: Pick<Wage, 'ratePerHour' | 'overtimeRatePerHour' | 'maximumHoursPerWeek'> | null
): Array<{ type: SupportedTokens; amount: number }> => {
  if (!wage) return []

  const { regularMinutes, overtimeMinutes } = splitClaimMinutes(totalMinutesWorked, wage)
  const result = new Map<SupportedTokens, number>()

  for (const rate of wage.ratePerHour ?? []) {
    result.set(rate.type, (result.get(rate.type) ?? 0) + (rate.amount * regularMinutes) / 60)
  }

  if (Array.isArray(wage.overtimeRatePerHour) && wage.overtimeRatePerHour.length > 0) {
    for (const rate of wage.overtimeRatePerHour) {
      result.set(rate.type, (result.get(rate.type) ?? 0) + (rate.amount * overtimeMinutes) / 60)
    }
  }

  return Array.from(result.entries()).map(([type, amount]) => ({ type, amount }))
}

export const buildWageClaimPayload = ({
  weeklyClaim,
  getTokenAddress
}: {
  weeklyClaim: Pick<WeeklyClaim, 'minutesWorked' | 'createdAt' | 'wage'>
  getTokenAddress: (type: string) => Address
}): WageClaimPayload => {
  const claimRates = buildClaimRatesWithOvertime({
    totalMinutesWorked: weeklyClaim.minutesWorked,
    maximumHoursPerWeek: weeklyClaim.wage.maximumHoursPerWeek,
    ratePerHour: weeklyClaim.wage.ratePerHour,
    overtimeRatePerHour: weeklyClaim.wage.overtimeRatePerHour
  })

  return {
    minutesWorked: weeklyClaim.minutesWorked,
    employeeAddress: weeklyClaim.wage.userAddress as Address,
    date: BigInt(Math.floor(new Date(weeklyClaim.createdAt).getTime() / 1000)),
    wages: claimRates.map((rate) => ({
      hourlyRate: rate.hourlyRate,
      tokenAddress: getTokenAddress(rate.type)
    }))
  }
}
