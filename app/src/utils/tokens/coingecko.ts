import type { CoinGeckoAssetMarketResponse, CoinGeckoHistoricalResponse } from '@/types/coingecko'
import { round6 } from '@/utils/accounting/toUsd'
import { assetLogoUri } from './assets'

export const COINGECKO_POLYGON_CHAIN_ID = 137
const POLYGON_PLATFORM = 'polygon-pos'

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
