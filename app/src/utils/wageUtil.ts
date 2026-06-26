import type {
  RatePerHour,
  RatePerHourWithEnabled,
  SupportedTokens,
  Wage,
  WeeklyClaim
} from '@/types'
import { parseEther, parseUnits, type Address } from 'viem'

const requiredRateTypes: RatePerHour['type'][] = ['native', 'usdc', 'sher']

export const formatMinutesAsDuration = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h ${m}min`
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

interface ClaimRateWithTotals {
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

const buildClaimRatesWithOvertime = ({
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
