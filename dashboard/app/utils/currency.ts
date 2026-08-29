import { formatUsd } from '~/utils/format'

export function formatUSD(amount: number): string {
  return formatUsd(amount, { decimals: Number.isFinite(amount) && amount % 1 !== 0 ? 4 : 2 })
}
