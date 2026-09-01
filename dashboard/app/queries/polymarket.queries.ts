import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { isAddress } from 'viem'
import { fetchAllPolymarketActivity, fetchAllPolymarketPositions, fetchPolymarketLatestPnl } from '~/api/polymarket'
import { fetchPolygonTokenTransfers } from '~/api/polygonscan'

/** Normalizes and validates an address ref shared by the accounting queries. */
function useValidAddress(address: MaybeRefOrGetter<string>) {
  return computed(() => {
    const value = toValue(address)?.trim() ?? ''
    return { value, valid: !!value && isAddress(value as `0x${string}`) }
  })
}

/** Full Polymarket activity history (all pages) for accounting. */
export function useAllPolymarketActivityQuery(address: MaybeRefOrGetter<string>) {
  const addr = useValidAddress(address)
  return useQuery(
    computed(() => ({
      queryKey: ['polymarket', 'activity-all', addr.value.value] as const,
      queryFn: async () => await fetchAllPolymarketActivity(addr.value.value),
      enabled: addr.value.valid,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5
    }))
  )
}

/** All-time Profit/Loss — same source as the Polymarket profile chart. */
export function usePolymarketUserPnlQuery(address: MaybeRefOrGetter<string>) {
  const addr = useValidAddress(address)
  return useQuery(
    computed(() => ({
      queryKey: ['polymarket', 'user-pnl', addr.value.value] as const,
      queryFn: async () => await fetchPolymarketLatestPnl(addr.value.value),
      enabled: addr.value.valid,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5
    }))
  )
}

/** Polymarket positions (cost basis + P&L) for accounting. */
export function usePolymarketPositionsQuery(address: MaybeRefOrGetter<string>) {
  const addr = useValidAddress(address)
  return useQuery(
    computed(() => ({
      queryKey: ['polymarket', 'positions', addr.value.value] as const,
      queryFn: async () => await fetchAllPolymarketPositions(addr.value.value),
      enabled: addr.value.valid,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5
    }))
  )
}

/** On-chain USDC transfers (deposits/withdrawals) via the Etherscan proxy route. */
export function usePolygonscanTransfersQuery(address: MaybeRefOrGetter<string>) {
  const addr = useValidAddress(address)
  return useQuery(
    computed(() => ({
      queryKey: ['polygonscan', 'transfers', addr.value.value] as const,
      queryFn: async () => await fetchPolygonTokenTransfers(addr.value.value),
      enabled: addr.value.valid,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5
    }))
  )
}
