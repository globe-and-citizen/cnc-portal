import type { RatePerHour, RatePerHourWithEnabled, WeeklyClaim } from '@/types'
import { parseEther, parseUnits, type Address } from 'viem'

export const requiredRateTypes: RatePerHour['type'][] = ['native', 'usdc', 'sher']

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

export interface ClaimRateWithTotals {
  type: RatePerHour['type']
  hourlyRate: bigint
  totalAmount: bigint
}

export interface WageClaimPayload {
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

export const getRegularAndOvertimeHours = (
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

    // totalAmount = (baseRate * regularMinutes + overtimeRate * overtimeMinutes) / 60
    const totalAmount =
      (baseRateWei * BigInt(regularMinutes) + overtimeRateWei * BigInt(overtimeMinutes)) / 60n
    // Per-minute rate for on-chain: totalAmount / totalMinutes
    const hourlyRate = totalMinutes > 0 ? totalAmount / BigInt(totalMinutes) : baseRateWei / 60n

    return {
      type: baseRate.type,
      hourlyRate,
      totalAmount
    }
  })
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
