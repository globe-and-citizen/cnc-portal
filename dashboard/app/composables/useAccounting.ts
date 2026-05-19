import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import {
  useAllPolymarketActivityQuery,
  usePolygonscanTransfersQuery,
  usePolymarketPositionsQuery
} from '~/queries/polymarket.queries'
import { buildLedger } from '~/utils/accounting'

/**
 * Aggregates the three Polymarket accounting data sources (activity, positions,
 * on-chain USDC transfers) into a single ledger + summary.
 */
export function useAccounting(address: MaybeRefOrGetter<string>) {
  const activityQuery = useAllPolymarketActivityQuery(address)
  const positionsQuery = usePolymarketPositionsQuery(address)
  const transfersQuery = usePolygonscanTransfersQuery(address)

  const ledger = computed(() => buildLedger({
    proxyWallet: toValue(address) ?? '',
    activities: activityQuery.data.value ?? [],
    positions: positionsQuery.data.value ?? [],
    transfers: transfersQuery.data.value?.transfers ?? []
  }))

  const isLoading = computed(() =>
    activityQuery.isLoading.value || positionsQuery.isLoading.value || transfersQuery.isLoading.value
  )
  const isFetching = computed(() =>
    activityQuery.isFetching.value || positionsQuery.isFetching.value || transfersQuery.isFetching.value
  )
  const error = computed(() =>
    activityQuery.error.value ?? positionsQuery.error.value ?? transfersQuery.error.value
  )
  /** True when the Etherscan history was too long to fetch in full. */
  const transfersTruncated = computed(() => transfersQuery.data.value?.truncated ?? false)

  function refetch(): void {
    void activityQuery.refetch()
    void positionsQuery.refetch()
    void transfersQuery.refetch()
  }

  return {
    entries: computed(() => ledger.value.entries),
    summary: computed(() => ledger.value.summary),
    positions: computed(() => positionsQuery.data.value ?? []),
    activities: computed(() => activityQuery.data.value ?? []),
    isLoading,
    isFetching,
    error,
    transfersTruncated,
    refetch
  }
}
