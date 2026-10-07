/** Pure presentation of supported and discovered Safe balances. */
import { formatUnits } from 'viem'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import type { ContractBalances } from '@/types'
import { formatExactNumber, formatNumber } from '@/utils/format'
import { formatCurrencyShort } from '@/utils/currency/display'
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

function holdingAmountLabel(quantity: string | null) {
  if (quantity === null) return 'Balance unavailable'
  const formatted = formatNumber(quantity)
  return Number(quantity) > 0 && formatted === '0' ? `<${formatNumber(0.0001)}` : formatted
}

export function safePortfolioRows(
  assets: readonly SafePortfolioAsset[],
  supported?: ContractBalances,
  currencyCode = 'USD'
) {
  const supportedIds = new Set(
    SUPPORTED_TOKENS.map((token) => assetId(token.address, currentChainId))
  )
  const pricedBalance = supported?.balances.find(
    (row) =>
      Number.isFinite(row.price.usd.value) &&
      row.price.usd.value > 0 &&
      Number.isFinite(row.price.local.value) &&
      row.price.local.value > 0
  )
  const localRate =
    currencyCode === 'USD'
      ? 1
      : pricedBalance
        ? pricedBalance.price.local.value / pricedBalance.price.usd.value
        : null
  const fixedRows = SUPPORTED_TOKENS.map((token) => {
    const balance = supported?.balances.find((entry) => entry.token.id === token.id)
    const localPrice = balance?.price.local.value
    const hasPrice = localPrice !== undefined && Number.isFinite(localPrice) && localPrice > 0
    return {
      id: assetId(token.address, currentChainId),
      name: token.name,
      symbol: token.symbol,
      address: token.id === 'native' ? null : token.address,
      icon:
        token.id !== 'native'
          ? USDCIcon
          : token.symbol === 'POL'
            ? MaticIcon
            : token.symbol === 'ETH'
              ? EthereumIcon
              : null,
      quantity: balance
        ? formatExactNumber(formatUnits(balance.raw, token.decimals))
        : 'Balance unavailable',
      amountLabel: holdingAmountLabel(balance ? formatUnits(balance.raw, token.decimals) : null),
      amount: balance?.amount ?? null,
      price: hasPrice ? localPrice : null,
      priceLabel: hasPrice ? balance!.price.local.formatted : 'Price unavailable',
      balance: balance?.raw === 0n ? 0 : balance && hasPrice ? balance.value.local.value : null,
      balanceLabel:
        balance?.raw === 0n
          ? formatCurrencyShort(0, currencyCode)
          : balance && hasPrice
            ? balance.value.local.formatted
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
    .map((row) => {
      const price = row.priceUsd !== null && localRate !== null ? row.priceUsd * localRate : null
      const balance = row.valueUsd !== null && localRate !== null ? row.valueUsd * localRate : null
      return {
        id: assetId(row.asset.address, row.asset.chainId),
        name: row.asset.name,
        symbol: row.asset.symbol,
        address: row.asset.address,
        icon: row.asset.logoUri ?? null,
        quantity: row.quantity === null ? 'Balance unavailable' : formatExactNumber(row.quantity),
        amountLabel: holdingAmountLabel(row.quantity),
        amount: row.quantity === null ? null : Number(row.quantity),
        price,
        priceLabel: price === null ? 'Price unavailable' : formatCurrencyShort(price, currencyCode),
        balance,
        balanceLabel:
          balance === null ? 'Value unavailable' : formatCurrencyShort(balance, currencyCode)
      }
    })
  return [...fixedRows, ...discoveredRows].map((row, index) => ({
    ...row,
    token: { name: row.name, symbol: row.symbol },
    rank: index + 1
  }))
}
