/** Discover held ERC-20s from complete Safe movements and read their current on-chain balance. */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { erc20Abi, formatUnits, isAddress, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useGetSafeTransfersQuery } from '@/queries/safe.queries'
import { fetchAssetMarket } from '@/queries/assetMarket.queries'
import { queryClient } from '@/queries/queryClient'
import { config } from '@/wagmi.config'
import { currentChainId } from '@/constant'
import { assetMetadata, knownAssetId, type AssetMetadata } from '@/utils/tokens/assets'
import type { SafePortfolioAsset } from '@/utils/safe/portfolio'
export type { SafePortfolioAsset } from '@/utils/safe/portfolio'

export function useSafePortfolio(address: MaybeRefOrGetter<Address | undefined>) {
  const chainId = useChainId()
  const supported = useContractBalance(address)
  const transfers = useGetSafeTransfersQuery({ pathParams: { safeAddress: address } })
  const discovered = computed(() => {
    const tokens = new Map<string, AssetMetadata>()
    for (const transfer of transfers.data.value ?? []) {
      if (
        transfer.type !== 'ERC20_TRANSFER' ||
        !transfer.tokenAddress ||
        !isAddress(transfer.tokenAddress) ||
        knownAssetId(transfer.tokenAddress)
      )
        continue
      const asset = assetMetadata(transfer.tokenAddress, currentChainId, transfer.tokenInfo)
      const existing = tokens.get(asset.id)
      if (!existing || existing.decimals === null) tokens.set(asset.id, asset)
    }
    return [...tokens.values()].sort((a, b) => a.id.localeCompare(b.id))
  })
  const assets = useQuery<SafePortfolioAsset[]>({
    queryKey: computed(() => [
      'safe-portfolio',
      { address: toValue(address), chainId: chainId.value, assets: discovered.value }
    ]),
    enabled: computed(() => Boolean(toValue(address)) && transfers.data.value !== undefined),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const network = config.chains.find(
        (chain) => chain.id === chainId.value && chain.id === currentChainId
      )
      if (!network) throw new Error('Switch to the Safe network to read its assets')
      const owner = toValue(address)!
      return Promise.all(
        discovered.value.map(async (source) => {
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
              const decimals = await readContract(config, {
                address: asset.address as Address,
                abi: erc20Abi,
                functionName: 'decimals',
                chainId: network.id
              })
              if (Number.isInteger(decimals) && decimals >= 0 && decimals <= 18)
                asset.decimals = decimals
            }
            if (raw !== 0n && asset.trusted !== false)
              priceUsd = (await fetchAssetMarket(queryClient, asset)).priceUsd
          } catch {
            /* Keep unknown balances/prices explicit in the portfolio. */
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
  })
  const isIncomplete = computed(
    () =>
      Boolean(supported.error.value) ||
      !supported.data.value ||
      Boolean(transfers.error.value) ||
      Boolean(assets.error.value) ||
      !transfers.data.value ||
      !assets.data.value ||
      assets.data.value.some((row) => row.valueUsd === null)
  )
  const totalUsd = computed(() =>
    !isIncomplete.value && supported.data.value
      ? supported.data.value.total.usd.value +
        (assets.data.value ?? []).reduce((sum, row) => sum + (row.valueUsd ?? 0), 0)
      : undefined
  )
  return {
    supported,
    assets,
    totalUsd,
    isIncomplete,
    isLoading: computed(
      () => supported.isLoading.value || transfers.isLoading.value || assets.isLoading.value
    ),
    refetch: () => Promise.allSettled([supported.refetch(), transfers.refetch(), assets.refetch()])
  }
}
