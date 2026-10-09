/** CoinGecko HTTP reads; query keys and cache lifetimes belong to coingecko.queries.ts. */
import { getMarketRead } from './externalReads'
import { assetLogoUri, type AssetMetadata } from '@/utils/tokens/assets'
import { round6 } from '@/utils/accounting/toUsd'

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'
export const COINGECKO_POLYGON_CHAIN_ID = 137
const POLYGON_PLATFORM = 'polygon-pos'

export interface TokenPriceResponse {
  market_data: {
    current_price: {
      [currency: string]: number
      usd: number
      cad: number
      eur: number
      idr: number
      inr: number
    }
  }
}

export interface AssetMarket {
  coinId: string
  priceUsd: number | null
  logoUri?: string
}

interface HistoricalRateResponse {
  market_data?: { current_price?: { usd?: unknown } }
}

interface AssetMarketResponse extends HistoricalRateResponse {
  id?: unknown
  platforms?: Record<string, string>
  image?: { small?: unknown; thumb?: unknown; large?: unknown }
}

export type AssetMarketFetcher = (
  url: string,
  signal?: AbortSignal
) => Promise<{ data: AssetMarketResponse }>

export type HistoricalRateFetcher = (
  url: string,
  signal?: AbortSignal
) => Promise<{ data: HistoricalRateResponse }>

/** Load current prices for a configured provider coin ID, with query cancellation. */
export async function getCoinGeckoTokenPrice(coinId: string, signal?: AbortSignal) {
  const { data } = await getMarketRead<TokenPriceResponse>(
    `${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}`,
    signal
  )
  return data
}

/** Verify the Polygon contract before accepting a provider coin ID, price or logo. */
export async function getCoinGeckoAssetMarket(
  asset: Pick<AssetMetadata, 'chainId' | 'address'>,
  signal?: AbortSignal,
  request: AssetMarketFetcher = getMarketRead
): Promise<AssetMarket> {
  if (asset.chainId !== COINGECKO_POLYGON_CHAIN_ID)
    throw new Error('Asset market network unavailable')
  const address = asset.address.toLowerCase()
  const { data: body } = await request(
    `${COINGECKO_API_URL}/coins/${POLYGON_PLATFORM}/contract/${encodeURIComponent(address)}`,
    signal
  )
  if (typeof body.id !== 'string' || body.platforms?.[POLYGON_PLATFORM]?.toLowerCase() !== address)
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

/** Read one historical USD snapshot; missing or inexact rates must remain valuation gaps. */
export async function getCoinGeckoHistoricalRate(
  coinId: string,
  date: string,
  signal?: AbortSignal,
  request: HistoricalRateFetcher = getMarketRead
): Promise<number> {
  const url = new URL(`${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}/history`)
  url.searchParams.set('date', date)
  url.searchParams.set('localization', 'false')
  const { data: body } = await request(url.toString(), signal)
  const rate = body.market_data?.current_price?.usd
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Historical USD rate unavailable for ${coinId} on ${date}`)
  }
  const rounded = round6(rate)
  if (rounded <= 0 || !Number.isSafeInteger(Math.round(rounded * 1e6))) {
    throw new Error(`Historical USD rate precision unavailable for ${coinId} on ${date}`)
  }
  return rounded
}
