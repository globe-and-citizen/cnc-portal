/** Async Safe service and ERC-20 reads; observer options remain in safe.queries.ts. */
import type { QueryClient } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { erc20Abi, formatUnits, isAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId } from '@/constant'
import { TX_SERVICE_BY_CHAIN, type SafeIncomingTransfer } from '@/types/safe'
import type { AssetMetadata } from '@/utils/tokens/assets'
import type { SafePortfolioAsset } from '@/utils/safe/portfolio'
import { fetchAssetMarket } from '@/queries/coingecko.queries'
import { getSafeRead } from './externalReads'

interface SafePage<T> {
  next: string | null
  results: T[]
}

/** Load every page in service order; a repeated next link is an invalid partial response. */
export async function fetchAllSafePages<T>(initialUrl: string, signal: AbortSignal): Promise<T[]> {
  const visited = new Set<string>()
  const results: T[] = []
  let pageUrl: string | null = initialUrl

  while (pageUrl) {
    if (visited.has(pageUrl)) throw new Error('Safe pagination returned a repeated page')
    visited.add(pageUrl)

    const currentUrl: string = pageUrl
    const { data } = await getSafeRead<SafePage<T>>(currentUrl, signal)
    results.push(...(data.results ?? []))
    pageUrl = data.next ? new URL(data.next, currentUrl).toString() : null
  }

  return results
}

/** Preserve transfer identity and recover missing contract metadata without dropping raw movements. */
export async function fetchSafeAssetTransfers(
  client: QueryClient,
  address: Address,
  chainId: typeof currentChainId,
  limit: number,
  signal: AbortSignal
): Promise<SafeIncomingTransfer[]> {
  const txService = TX_SERVICE_BY_CHAIN[chainId]
  if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)
  const rows = await fetchAllSafePages<SafeIncomingTransfer>(
    `${txService.url}/api/v1/safes/${address}/transfers/?limit=${limit}`,
    signal
  )
  const unique = new Map<string, SafeIncomingTransfer>()
  for (const row of rows) {
    if (!row.transferId) throw new Error('Safe transfer identity unavailable')
    unique.set(row.transferId, row)
  }
  const transfers = [...unique.values()]
  const missing = new Map<string, SafeIncomingTransfer[]>()
  for (const row of transfers) {
    if (row.type !== 'ERC20_TRANSFER' || !row.tokenAddress || !isAddress(row.tokenAddress)) continue
    if (
      row.tokenInfo?.address?.toLowerCase() === row.tokenAddress.toLowerCase() &&
      Number.isInteger(row.tokenInfo.decimals) &&
      row.tokenInfo.decimals >= 0 &&
      row.tokenInfo.decimals <= 18
    )
      continue
    const bucket = missing.get(row.tokenAddress.toLowerCase()) ?? []
    bucket.push(row)
    missing.set(row.tokenAddress.toLowerCase(), bucket)
  }
  await Promise.all(
    [...missing].map(async ([tokenAddress, rows]) => {
      try {
        const token = tokenAddress as Address
        const [decimals, symbol, name] = await client.fetchQuery({
          queryKey: ['safe-token-metadata', chainId, tokenAddress],
          staleTime: 24 * 60 * 60_000,
          gcTime: 24 * 60 * 60_000,
          retry: false,
          queryFn: () =>
            Promise.all([
              readContract(config, {
                address: token,
                abi: erc20Abi,
                functionName: 'decimals',
                chainId
              }),
              readContract(config, {
                address: token,
                abi: erc20Abi,
                functionName: 'symbol',
                chainId
              }).catch(() => tokenAddress),
              readContract(config, {
                address: token,
                abi: erc20Abi,
                functionName: 'name',
                chainId
              }).catch(() => 'Unknown token')
            ])
        })
        for (const row of rows)
          row.tokenInfo = {
            type: 'ERC20',
            address: tokenAddress,
            name,
            symbol,
            decimals,
            ...(row.tokenInfo?.address?.toLowerCase() === tokenAddress.toLowerCase() &&
            row.tokenInfo.logoUri
              ? { logoUri: row.tokenInfo.logoUri }
              : {}),
            ...(row.tokenInfo?.trusted === false ? { trusted: false } : {})
          }
      } catch {
        /* Retain raw movements with an explicit metadata diagnostic. */
      }
    })
  )
  return transfers
}

/** Read discovered ERC-20 balances independently of Safe service history. */
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
