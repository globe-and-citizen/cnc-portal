import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import {
  useAllPolymarketActivityQuery,
  usePolygonscanTransfersQuery,
  usePolymarketPositionsQuery
} from '~/queries/polymarket.queries'
import { buildLedger } from '~/utils/accounting'
import { buildBalanceSheet } from '~/utils/balanceSheet'
import { buildGeneralLedger } from '~/utils/generalLedger'
import { computeAccountingIdentities } from '~/utils/accountingIdentities'
import { computeRealizedTrades } from '~/utils/incomeStatement'

/**
 * Aggregates the three Polymarket accounting data sources (activity, positions,
 * on-chain USDC transfers) into a single ledger + summary, plus the derived
 * balance sheet, general ledger and 8 accounting identities.
 *
 * @param address Reactive wallet address (URL query param, see useWalletAddress).
 */
export function useAccounting(address: MaybeRefOrGetter<string>) {
  const activityQuery = useAllPolymarketActivityQuery(address)
  const positionsQuery = usePolymarketPositionsQuery(address)
  const transfersQuery = usePolygonscanTransfersQuery(address)

  // Dated realized disposals (lot accounting) — shared by every statement.
  // Computed before the ledger so the Summary's realizedPnl can be sourced
  // from the same lot accounting as the Income Statement (identity #8).
  const realizedTrades = computed(() =>
    computeRealizedTrades(activityQuery.data.value ?? [], positionsQuery.data.value ?? [])
  )

  const ledger = computed(() => buildLedger({
    proxyWallet: toValue(address) ?? '',
    activities: activityQuery.data.value ?? [],
    positions: positionsQuery.data.value ?? [],
    transfers: transfersQuery.data.value?.transfers ?? [],
    realizedTrades: realizedTrades.value
  }))

  const balanceSheet = computed(() => buildBalanceSheet({
    ledgerEntries: ledger.value.entries,
    realizedTrades: realizedTrades.value,
    positions: positionsQuery.data.value ?? []
  }))

  const generalLedger = computed(() => buildGeneralLedger({
    ledgerEntries: ledger.value.entries,
    realizedTrades: realizedTrades.value
  }))

  const isAsOfToday = computed(() => true)

  const identities = computed(() => computeAccountingIdentities({
    summary: ledger.value.summary,
    balanceSheet: balanceSheet.value,
    generalLedger: generalLedger.value,
    realizedTrades: realizedTrades.value,
    activities: activityQuery.data.value ?? [],
    transfers: transfersQuery.data.value?.transfers ?? [],
    isAsOfToday: isAsOfToday.value
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
    realizedTrades,
    balanceSheet,
    generalLedger,
    identities,
    isAsOfToday,
    isLoading,
    isFetching,
    error,
    transfersTruncated,
    refetch
  }
}
