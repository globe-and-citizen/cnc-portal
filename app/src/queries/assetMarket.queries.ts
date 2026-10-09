/** Contract-based market discovery; symbols never select a price source. */
import type { QueryClient } from '@tanstack/vue-query'
import type { AssetMetadata } from '@/utils/tokens/assets'
import { assetLogoUri } from '@/utils/tokens/assets'
import { getMarketRead } from '@/lib/externalReads'

const POLYGON_CHAIN_ID = 137
const POLYGON_PLATFORM = 'polygon-pos'
interface AssetMarket {
  coinId: string
  priceUsd: number | null
  logoUri?: string
}
interface AssetMarketResponse {
  id?: unknown
  platforms?: Record<string, string>
  market_data?: { current_price?: { usd?: unknown } }
  image?: { small?: unknown; thumb?: unknown; large?: unknown }
}

type Request = (url: string, signal?: AbortSignal) => Promise<{ data: AssetMarketResponse }>

export async function fetchAssetMarket(
  client: QueryClient,
  asset: Pick<AssetMetadata, 'chainId' | 'address'>,
  request: Request = getMarketRead
): Promise<AssetMarket> {
  const platform = asset.chainId === POLYGON_CHAIN_ID ? POLYGON_PLATFORM : undefined
  if (!platform) throw new Error('Asset market network unavailable')
  return client.fetchQuery({
    queryKey: ['asset-market', asset.chainId, asset.address.toLowerCase()],
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const { data: body } = await request(
        `https://api.coingecko.com/api/v3/coins/${platform}/contract/${encodeURIComponent(asset.address.toLowerCase())}`,
        signal
      )
      if (
        typeof body.id !== 'string' ||
        body.platforms?.[platform]?.toLowerCase() !== asset.address.toLowerCase()
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
  })
}

export async function fetchAssetCoinId(client: QueryClient, token: string): Promise<string> {
  const [, chain, address] = token.split(':')
  if (!address) throw new Error('Asset contract unavailable')
  return client.fetchQuery({
    queryKey: ['asset-coin-id', Number(chain), address.toLowerCase()],
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: false,
    queryFn: async () =>
      (await fetchAssetMarket(client, { chainId: Number(chain), address })).coinId
  })
}
