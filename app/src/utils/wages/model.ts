import type {
  RatePerHour,
  RatePerHourWithEnabled,
  SupportedTokens,
  Wage,
  WeeklyClaim
} from '@/types'
import { parseEther, parseUnits, type Address } from 'viem'
import { NETWORK } from '@/constant'

const requiredRateTypes: RatePerHour['type'][] = ['native', 'usdc', 'sher']

/**
 * Daily hours ceiling applied when a wage does not specify one.
 */
export const DEFAULT_MAXIMUM_HOURS_PER_DAY = 8

/**
 * Worked time in hours and minutes (`27h 30min`, `8h`, `45min`). Hours never roll over
 * into days, so a week of work reads as the total hours claimed.
 */
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

/**
 * Splits total minutes worked into regular vs overtime minutes for a given wage.
 * Overtime only applies when the wage actually defines an overtime rate; otherwise
 * every minute is treated as regular time.
 */
export const splitClaimMinutes = (
  totalMinutesWorked: number,
  wage?: {
    overtimeRatePerHour?: RatePerHour[] | null
    maximumHoursPerWeek?: number | null
  } | null
) => {
  const hasOvertime =
    Array.isArray(wage?.overtimeRatePerHour) && (wage?.overtimeRatePerHour.length ?? 0) > 0
  return getRegularAndOvertimeHours(
    totalMinutesWorked,
    hasOvertime ? wage?.maximumHoursPerWeek : null
  )
}

/**
 * One entry per token the wage pays, pairing its regular and overtime hourly rates.
 * A token the wage does not rate for one kind of time earns nothing for that time.
 */
const pairRatesByToken = (
  ratePerHour: RatePerHour[],
  overtimeRatePerHour?: RatePerHour[] | null
) => {
  const overtimeRates = overtimeRatePerHour ?? []
  const amountOf = (rates: RatePerHour[], type: SupportedTokens) =>
    rates.find((rate) => rate.type === type)?.amount ?? 0
  const tokenTypes = new Set([...ratePerHour, ...overtimeRates].map((rate) => rate.type))

  return [...tokenTypes].map((type) => ({
    type,
    regularRate: amountOf(ratePerHour, type),
    overtimeRate: amountOf(overtimeRates, type)
  }))
}

/**
 * What a claim pays per token according to its wage, in base units. A token paid only
 * in overtime is left out of a week without overtime, so it never reaches the contract.
 *
 * `hourlyRate` is the blended rate to sign, because the contract pays a single rate for
 * the whole week: `minutesWorked * hourlyRate / 60`. It truncates to the token's
 * precision, so the contract can pay a few base units under `totalAmount`.
 */
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
  const { regularMinutes, overtimeMinutes, totalMinutes } = splitClaimMinutes(totalMinutesWorked, {
    maximumHoursPerWeek,
    overtimeRatePerHour
  })

  return pairRatesByToken(ratePerHour, overtimeRatePerHour)
    .map(({ type, regularRate, overtimeRate }) => {
      const regularRateInBaseUnits = parseRateAmount(regularRate, type)
      const overtimeRateInBaseUnits = parseRateAmount(overtimeRate, type)
      const totalAmount =
        (regularRateInBaseUnits * BigInt(regularMinutes) +
          overtimeRateInBaseUnits * BigInt(overtimeMinutes)) /
        60n
      const hourlyRate =
        totalMinutes > 0 ? (totalAmount * 60n) / BigInt(totalMinutes) : regularRateInBaseUnits

      return { type, hourlyRate, totalAmount }
    })
    .filter(({ hourlyRate }) => hourlyRate > 0n)
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

  return pairRatesByToken(wage.ratePerHour ?? [], wage.overtimeRatePerHour).map(
    ({ type, regularRate, overtimeRate }) => ({
      type,
      amount: (regularRate * regularMinutes + overtimeRate * overtimeMinutes) / 60
    })
  )
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
