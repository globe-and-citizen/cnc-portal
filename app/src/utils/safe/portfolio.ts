/** Pure presentation of discovered Safe balances with explicit unavailable values. */
import { formatExactNumber, formatUsd } from '@/utils/format'
import type { AssetMetadata } from '@/utils/tokens/assets'

export interface SafePortfolioAsset {
  asset: AssetMetadata
  raw: bigint | null
  quantity: string | null
  priceUsd: number | null
  valueUsd: number | null
}

export function safePortfolioRows(assets: readonly SafePortfolioAsset[]) {
  return assets
    .filter((row) => row.raw !== 0n)
    .map((row) => ({
      name: row.asset.name,
      symbol: row.asset.symbol,
      address: row.asset.address,
      quantity: row.quantity === null ? 'Unavailable' : formatExactNumber(row.quantity),
      price: row.priceUsd === null ? 'Unavailable' : formatUsd(row.priceUsd, { decimals: 6 }),
      value: row.valueUsd === null ? 'Unavailable' : formatUsd(row.valueUsd)
    }))
}
