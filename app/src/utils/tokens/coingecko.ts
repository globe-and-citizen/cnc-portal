import type { CoinGeckoAssetMarketResponse, CoinGeckoHistoricalResponse } from '@/types/coingecko'
import { round6, utcRateDate } from '@/utils/accounting/toUsd'
import { assetLogoUri } from './assets'
import { SUPPORTED_TOKENS } from '@/constant'
import type { HistoricalRateTarget } from '@/utils/accounting/toUsd'
import type { AssetId } from './assets'

export const COINGECKO_POLYGON_CHAIN_ID = 137
const POLYGON_PLATFORM = 'polygon-pos'

interface CoinGeckoRateTarget extends HistoricalRateTarget {
  coinId: string
}

/** Normalize Accounting targets while retaining contract identity for provider discovery. */
export function coinGeckoRateTargets(
  targets: readonly HistoricalRateTarget[],
  markets: readonly { chainId: number; address: string; data?: CoinGeckoAssetMarketResponse }[] = []
) {
  const assets = new Map<string, { chainId: number; address: string }>()
  const resolved = new Map<string, CoinGeckoRateTarget>()
  for (const target of targets) {
    let coinId = SUPPORTED_TOKENS.find(({ id }) => id === target.token)?.coingeckoId
    if (target.token.startsWith('erc20:')) {
      const [, chain, contract] = target.token.split(':')
      if (!contract) continue
      const chainId = Number(chain)
      const address = contract.toLowerCase()
      assets.set(`${chainId}:${address}`, { chainId, address })
      const body = markets.find(
        (market) => market.chainId === chainId && market.address === address
      )?.data
      if (!body || chainId !== COINGECKO_POLYGON_CHAIN_ID) continue
      try {
        coinId = assetMarketFromResponse(body, address).coinId
      } catch {
        continue
      }
    }
    if (coinId && coinId !== 'unknown')
      resolved.set(`${target.token}:${target.date}`, { ...target, coinId })
  }
  const rates = [...resolved.values()]
  return {
    assets: [...assets.values()],
    targets: rates,
    requests: [
      ...new Map(rates.map(({ coinId, date }) => [`${coinId}:${date}`, { coinId, date }])).values()
    ]
  }
}

/** Resolve a rate by identity; an unavailable or invalid snapshot remains a valuation gap. */
export function coinGeckoRateOfRecord(
  targets: readonly CoinGeckoRateTarget[],
  history: readonly { coinId: string; date: string; data?: CoinGeckoHistoricalResponse }[],
  token: AssetId,
  at: Date
): number {
  const date = utcRateDate(at)
  const target = targets.find((target) => target.token === token && target.date === date)
  const body = history.find(
    (snapshot) => snapshot.coinId === target?.coinId && snapshot.date === date
  )?.data
  if (!target || !body) return 0
  try {
    return historicalRateFromResponse(body, target.coinId, date)
  } catch {
    return 0
  }
}

/** Provider Retry-After is seconds or an HTTP date; never retry a throttled batch before one minute. */
export function retryAfterDelay(value: unknown, now: number): number {
  if (typeof value !== 'string' || !value.trim()) return 60_000
  const seconds = Number(value)
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now
  return Number.isFinite(delay) ? Math.max(60_000, delay) : 60_000
}

export interface AssetMarket {
  coinId: string
  priceUsd: number | null
  logoUri?: string
}

/** Accept prices and logos only from metadata for the exact Polygon contract. */
export function assetMarketFromResponse(
  body: CoinGeckoAssetMarketResponse,
  address: string
): AssetMarket {
  if (
    typeof body.id !== 'string' ||
    body.platforms?.[POLYGON_PLATFORM]?.toLowerCase() !== address.toLowerCase()
  )
    throw new Error('Asset market contract mismatch')
  const price = body.market_data?.current_price?.usd
  const logoUri =
    assetLogoUri(body.image?.small) ??
    assetLogoUri(body.image?.thumb) ??
    assetLogoUri(body.image?.large)
  return {
    coinId: body.id,
    priceUsd: typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null,
    ...(logoUri ? { logoUri } : {})
  }
}

/** Preserve the historical six-decimal precision contract and unavailable-rate failures. */
export function historicalRateFromResponse(
  body: CoinGeckoHistoricalResponse,
  coinId: string,
  date: string
): number {
  const rate = body.market_data?.current_price?.usd
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0)
    throw new Error(`Historical USD rate unavailable for ${coinId} on ${date}`)
  const rounded = round6(rate)
  if (rounded <= 0 || !Number.isSafeInteger(Math.round(rounded * 1e6)))
    throw new Error(`Historical USD rate precision unavailable for ${coinId} on ${date}`)
  return rounded
}
