import type { RatePerHour, RatePerHourWithEnabled } from '@/types'

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
