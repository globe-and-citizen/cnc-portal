import { formatCompact, formatNumber } from '@/utils/format'

export function formatCurrencyShort(number: number, currency = 'USD') {
  return formatCompact(number, { currency })
}

export function formatCryptoAmount(amount: string | number) {
  return formatNumber(amount, { minDecimals: 2, maxDecimals: 20 })
}

export function formatAmountWithPrecision(
  amount: string | number,
  minimumFractionDigits: number = 4,
  maximumFractionDigits: number = 20
) {
  return formatNumber(amount, {
    minDecimals: minimumFractionDigits,
    maxDecimals: maximumFractionDigits
  })
}
