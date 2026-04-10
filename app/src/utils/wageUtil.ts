import type { RatePerHour, RatePerHourWithEnabled } from '@/types'
import { parseEther, parseUnits } from 'viem'

export const requiredRateTypes: RatePerHour['type'][] = ['native', 'usdc', 'sher']

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

const parseRateAmount = (amount: number, type: RatePerHour['type']) => {
  return type === 'native' ? parseEther(`${amount}`) : parseUnits(`${amount}`, 6)
}

export const getRegularAndOvertimeHours = (
  hoursWorked: number,
  maximumHoursPerWeek?: number | null
) => {
  const safeHoursWorked = Math.max(0, Math.floor(hoursWorked))
  const hasValidWeeklyLimit =
    typeof maximumHoursPerWeek === 'number' &&
    Number.isFinite(maximumHoursPerWeek) &&
    maximumHoursPerWeek > 0

  const maxRegularHours = hasValidWeeklyLimit
    ? Math.max(0, Math.floor(maximumHoursPerWeek as number))
    : safeHoursWorked

  const regularHours = Math.min(safeHoursWorked, maxRegularHours)
  const overtimeHours = Math.max(0, safeHoursWorked - regularHours)

  return {
    regularHours,
    overtimeHours,
    totalHours: safeHoursWorked
  }
}

export const buildClaimRatesWithOvertime = ({
  hoursWorked,
  maximumHoursPerWeek,
  ratePerHour,
  overtimeRatePerHour
}: {
  hoursWorked: number
  maximumHoursPerWeek?: number | null
  ratePerHour: RatePerHour[]
  overtimeRatePerHour?: RatePerHour[] | null
}): ClaimRateWithTotals[] => {
  const { regularHours, overtimeHours, totalHours } = getRegularAndOvertimeHours(
    hoursWorked,
    maximumHoursPerWeek
  )

  return ratePerHour.map((baseRate) => {
    const baseRateWei = parseRateAmount(baseRate.amount, baseRate.type)
    const overtimeRate = overtimeRatePerHour?.find((rate) => rate.type === baseRate.type)
    const overtimeRateWei = overtimeRate
      ? parseRateAmount(overtimeRate.amount, baseRate.type)
      : baseRateWei

    const totalAmount = baseRateWei * BigInt(regularHours) + overtimeRateWei * BigInt(overtimeHours)
    const hourlyRate = totalHours > 0 ? totalAmount / BigInt(totalHours) : baseRateWei

    return {
      type: baseRate.type,
      hourlyRate,
      totalAmount
    }
  })
}
