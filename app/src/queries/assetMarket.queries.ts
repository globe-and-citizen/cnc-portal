/** Contract-based market discovery; symbols never select a price source. */
import type { QueryClient } from '@tanstack/vue-query'
import type { AssetMetadata } from '@/utils/tokens/assets'

const PLATFORMS: Readonly<Record<number, string>> = {
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  10: 'optimistic-ethereum',
  8453: 'base'
}
interface AssetMarket {
  coinId: string
  priceUsd: number | null
}
type Request = (
  input: string,
  init?: RequestInit
) => Promise<{ ok: boolean; json(): Promise<unknown> }>

export async function fetchAssetMarket(
  client: QueryClient,
  asset: Pick<AssetMetadata, 'chainId' | 'address'>,
  request: Request = globalThis.fetch
): Promise<AssetMarket> {
  const platform = PLATFORMS[asset.chainId]
  if (!platform) throw new Error('Asset market network unavailable')
  return client.fetchQuery({
    queryKey: ['asset-market', asset.chainId, asset.address.toLowerCase()],
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await request(
        `https://api.coingecko.com/api/v3/coins/${platform}/contract/${encodeURIComponent(asset.address.toLowerCase())}`,
        { signal }
      )
      if (!response.ok) throw new Error('Asset market unavailable')
      const body = (await response.json()) as {
        id?: unknown
        platforms?: Record<string, string>
        market_data?: { current_price?: { usd?: unknown } }
      }
      if (
        typeof body.id !== 'string' ||
        body.platforms?.[platform]?.toLowerCase() !== asset.address.toLowerCase()
      )
        throw new Error('Asset market contract mismatch')
      const price = body.market_data?.current_price?.usd
      return {
        coinId: body.id,
        priceUsd: typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null
      }
    }
  })
}

export async function fetchAssetCoinId(client: QueryClient, token: string): Promise<string> {
  const [, chain, address] = token.split(':')
  if (!address) throw new Error('Asset contract unavailable')
  return client.fetchQuery({
    queryKey: ['asset-coin-id', Number(chain), address.toLowerCase()],
    staleTime: Infinity,
    queryFn: async () =>
      (await fetchAssetMarket(client, { chainId: Number(chain), address })).coinId
  })
}
