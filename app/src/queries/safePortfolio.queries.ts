/** On-chain balance reads for discovered Safe assets, cached with standard query state. */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, type QueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { erc20Abi, formatUnits, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId } from '@/constant'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import { failureDetails } from '@/lib/externalReads'
import type { AssetMetadata } from '@/utils/tokens/assets'
import type { SafePortfolioAsset } from '@/utils/safe/portfolio'
import { fetchAssetMarket } from './assetMarket.queries'
import { queryClient } from './queryClient'

export async function fetchSafePortfolioAssets(
  client: QueryClient,
  sources: readonly AssetMetadata[],
  owner: Address,
  networkId: number
): Promise<SafePortfolioAsset[]> {
  const network = config.chains.find(
    (chain) => chain.id === networkId && chain.id === currentChainId
  )
  if (!network) throw new Error('Switch to the Safe network to read its assets')
  return Promise.all(
    sources.map(async (source) => {
      const asset = { ...source }
      let raw: bigint | null = null
      let priceUsd: number | null = null
      try {
        raw = await readContract(config, {
          address: asset.address as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [owner],
          chainId: network.id
        })
        if (asset.decimals === null) {
          const decimals = await client.fetchQuery({
            queryKey: ['safe-token-decimals', network.id, asset.address.toLowerCase()],
            staleTime: 24 * 60 * 60_000,
            gcTime: 24 * 60 * 60_000,
            retry: false,
            queryFn: () =>
              readContract(config, {
                address: asset.address as Address,
                abi: erc20Abi,
                functionName: 'decimals',
                chainId: network.id
              })
          })
          if (Number.isInteger(decimals) && decimals >= 0 && decimals <= 18)
            asset.decimals = decimals
        }
      } catch {
        /* Keep unknown balances explicit; price availability must not erase a balance. */
      }
      if (raw !== null && raw !== 0n && asset.trusted !== false) {
        try {
          const market = await fetchAssetMarket(client, asset)
          priceUsd = market.priceUsd
          asset.logoUri ??= market.logoUri
        } catch {
          /* Keep the verified balance when the market service is unavailable. */
        }
      }
      const quantity =
        raw !== null && asset.decimals !== null ? formatUnits(raw, asset.decimals) : null
      const value = quantity !== null && priceUsd !== null ? Number(quantity) * priceUsd : null
      return {
        asset,
        raw,
        quantity,
        priceUsd,
        valueUsd: raw === 0n ? 0 : value !== null && Number.isFinite(value) ? value : null
      }
    })
  )
}

export function useGetSafePortfolioAssetsQuery(
  address: MaybeRefOrGetter<Address | undefined>,
  sources: MaybeRefOrGetter<readonly AssetMetadata[]>,
  enabled: MaybeRefOrGetter<boolean>
) {
  const chainId = useChainId()
  return useQuery({
    queryKey: computed(() => [
      ...contractBalanceKeys.detail(toValue(address), chainId.value),
      'safe-portfolio',
      { assets: toValue(sources) }
    ]),
    enabled: computed(() => Boolean(toValue(address)) && toValue(enabled)),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const { status } = failureDetails(error)
      return failureCount < 1 && (status === undefined || status >= 500)
    },
    retryDelay: 5000,
    queryFn: () =>
      fetchSafePortfolioAssets(queryClient, toValue(sources), toValue(address)!, chainId.value)
  })
}
