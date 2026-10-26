/**
 * Safe Transaction Service page loading, split out of {@link ./safe.queries} so the
 * query hooks stay focused on cache keys and options.
 */
import type { QueryClient } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { erc20Abi, isAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import externalApiClient from '@/lib/external.axios'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'
import { currentChainId } from '@/constant/index'
import type { SafeIncomingTransfer } from '@/types'
import { queryPresets } from './queryFactory'

const chainId = currentChainId
const txService = TX_SERVICE_BY_CHAIN[chainId]

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
    const { data } = await externalApiClient.get<SafePage<T>>(currentUrl, { signal })
    results.push(...(data.results ?? []))
    pageUrl = data.next ? new URL(data.next, currentUrl).toString() : null
  }

  return results
}

/** Preserve transfer identity and recover missing contract metadata without dropping raw movements. */
export async function fetchSafeAssetTransfers(
  client: QueryClient,
  address: Address,
  limit: number,
  signal: AbortSignal
): Promise<SafeIncomingTransfer[]> {
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
  return Promise.all(
    [...unique.values()].map(async (row) => {
      if (row.type !== 'ERC20_TRANSFER' || !row.tokenAddress || !isAddress(row.tokenAddress))
        return row
      const tokenAddress = row.tokenAddress.toLowerCase() as Address
      if (
        row.tokenInfo?.address?.toLowerCase() === tokenAddress &&
        Number.isInteger(row.tokenInfo.decimals) &&
        row.tokenInfo.decimals >= 0 &&
        row.tokenInfo.decimals <= 18
      )
        return row
      try {
        const [decimals, symbol, name] = await client.fetchQuery({
          ...queryPresets.once,
          queryKey: ['safe-token-metadata', chainId, tokenAddress],
          gcTime: 24 * 60 * 60_000,
          queryFn: () =>
            Promise.all([
              readContract(config, {
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'decimals',
                chainId
              }),
              readContract(config, {
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'symbol',
                chainId
              }).catch(() => tokenAddress),
              readContract(config, {
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'name',
                chainId
              }).catch(() => 'Unknown token')
            ])
        })
        return {
          ...row,
          tokenInfo: {
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
        }
      } catch {
        /* Retain raw movements with an explicit metadata diagnostic. */
        return row
      }
    })
  )
}
