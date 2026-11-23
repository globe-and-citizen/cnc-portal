import { usdAmountToNumber } from '@/utils/accounting/monetaryAmount'
import type { UsdAmount } from '@/utils/accounting/types'

/** Excel retains at most 15 significant decimal digits. Reject values whose
 * displayed precision cannot be represented within that limit. */
export function spreadsheetNumber(
  value: number | null | undefined,
  decimals: number
): number | 'Unavailable' {
  if (value == null || !Number.isFinite(value)) return 'Unavailable'
  const factor = 10 ** decimals
  // Match the display formatter's handling of negative amounts rounding to zero.
  if (Math.round(value * factor) === 0) return 0
  const [coefficient, exponent = '0'] = Math.abs(value).toString().split('e')
  const scaled = Number(`${coefficient}e${Number(exponent) + decimals}`)
  const rounded = Math.round(scaled)
  if (!Number.isSafeInteger(rounded) || rounded >= 1e15) return 'Unavailable'
  return Math.sign(value) * (rounded / factor)
}

export function spreadsheetUsd(value: UsdAmount | null | undefined): number | '' | 'Unavailable' {
  return value == null ? '' : spreadsheetNumber(usdAmountToNumber(value), 2)
}
