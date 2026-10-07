/** Pure presentation of supported and discovered Safe balances. */
import { formatUnits } from 'viem'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import type { ContractBalances } from '@/types'
import { formatExactNumber, formatUsd } from '@/utils/format'
import { assetId, type AssetMetadata } from '@/utils/tokens/assets'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'

export interface SafePortfolioAsset {
  asset: AssetMetadata
  raw: bigint | null
  quantity: string | null
  priceUsd: number | null
  valueUsd: number | null
}

export function safePortfolioRows(
  assets: readonly SafePortfolioAsset[],
  supported?: ContractBalances
) {
  const supportedIds = new Set(
    SUPPORTED_TOKENS.map((token) => assetId(token.address, currentChainId))
  )
  const fixedRows = SUPPORTED_TOKENS.map((token) => {
    const balance = supported?.balances.find((entry) => entry.token.id === token.id)
    const priceUsd = balance?.price.usd.value
    const hasPrice = priceUsd !== undefined && Number.isFinite(priceUsd) && priceUsd > 0
    return {
      id: assetId(token.address, currentChainId),
      name: token.name,
      symbol: token.symbol,
      address: token.id === 'native' ? null : token.address,
      icon: token.id !== 'native' ? USDCIcon : token.symbol === 'POL' ? MaticIcon : EthereumIcon,
      quantity: balance
        ? formatExactNumber(formatUnits(balance.raw, token.decimals))
        : 'Balance unavailable',
      price: hasPrice ? formatUsd(priceUsd, { decimals: 6 }) : 'Price unavailable',
      value:
        balance?.raw === 0n
          ? formatUsd(0)
          : balance && hasPrice
            ? formatUsd(balance.value.usd.value)
            : 'Value unavailable'
    }
  })
  const discovered = new Map<string, SafePortfolioAsset>()
  for (const row of assets) {
    const id = assetId(row.asset.address, row.asset.chainId)
    if (!supportedIds.has(id)) discovered.set(id, row)
  }
  const discoveredRows = [...discovered.values()]
    .filter((row) => row.raw !== 0n)
    .sort((a, b) => a.asset.id.localeCompare(b.asset.id))
    .map((row) => ({
      id: assetId(row.asset.address, row.asset.chainId),
      name: row.asset.name,
      symbol: row.asset.symbol,
      address: row.asset.address,
      icon: null,
      quantity: row.quantity === null ? 'Balance unavailable' : formatExactNumber(row.quantity),
      price: row.priceUsd === null ? 'Price unavailable' : formatUsd(row.priceUsd, { decimals: 6 }),
      value: row.valueUsd === null ? 'Value unavailable' : formatUsd(row.valueUsd)
    }))
  return [...fixedRows, ...discoveredRows].map((row, index) => ({ ...row, rank: index + 1 }))
}
