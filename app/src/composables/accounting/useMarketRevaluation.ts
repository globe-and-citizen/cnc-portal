import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useTeamStore } from '@/stores'
import {
  useGetAssetMarketsQuery,
  useGetHistoricalTokenRatesQuery
} from '@/queries/coingecko.queries'
import { coinGeckoRateOfRecord, coinGeckoRateTargets } from '@/utils/tokens/coingecko'
import { utcRateDate } from '@/utils/accounting/toUsd'
import {
  revaluationEntries,
  revaluationOf,
  safePositionsAt
} from '@/utils/accounting/marketRevaluation'
import type { UsdAmount } from '@/utils/accounting/types'
import { useAccountingContext } from './useAccountingContext'
import { useSafePnl } from './useSafePnl'

export interface MarketRevaluationSummary {
  at: number
  /** `gateway`: today's Safe Account valuation; `daily`: CoinGecko daily snapshot. */
  source: 'gateway' | 'daily'
  cost: UsdAmount
  market: UsdAmount
  adjustment: UsdAmount
}

/**
 * Adjusting entries that show the Safe at market value on each report date (`null` = now).
 * Today uses the Safe Gateway valuation shown on Safe Account; a past date uses CoinGecko's
 * daily snapshot at the end of that UTC day, with stablecoins at their peg. Without complete
 * evidence for every date the report stays at historical cost and `status` says why.
 */
export function useMarketRevaluation(dates: MaybeRefOrGetter<readonly (Date | null)[]>) {
  const accounting = useAccountingContext()
  const teamStore = useTeamStore()
  const safeAddress = computed(() => teamStore.getContractAddressByType('Safe'))
  const pnl = useSafePnl(
    () => accounting.journal.value,
    () => accounting.status.state.value === 'ready',
    safeAddress
  )
  const now = Math.floor(Date.now() / 1000)
  const startOfToday = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  const points = computed(() =>
    toValue(dates).map((date) => {
      const at = date ? Math.floor(date.getTime() / 1000) : now
      return at >= startOfToday
        ? { at: Math.min(at, now), rateAt: undefined, positions: [] }
        : {
            at,
            rateAt: new Date((at + 1) * 1000),
            positions: safePositionsAt(accounting.journal.value, at)
          }
    })
  )
  const targets = computed(() =>
    points.value.flatMap(({ rateAt, positions }) =>
      rateAt
        ? positions.map((position) => ({ token: position.token, date: utcRateDate(rateAt) }))
        : []
    )
  )
  const assetMarkets = useGetAssetMarketsQuery(() => coinGeckoRateTargets(targets.value).assets)
  const marketTargets = computed(() => coinGeckoRateTargets(targets.value, assetMarkets.value))
  const rates = useGetHistoricalTokenRatesQuery(() => marketTargets.value.requests)
  const safeCostAt = (at: number) =>
    accounting.journal.value
      .filter((entry) => entry.timestamp <= at)
      .flatMap((entry) => entry.lines)
      .filter((line) => line.account.family.name === 'Cash — Safe')
      .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)

  const summaries = computed<(MarketRevaluationSummary | null)[]>(() =>
    points.value.map((point) => {
      const rateAt = point.rateAt
      if (!safeAddress.value)
        return { at: point.at, source: 'gateway', cost: 0n, market: 0n, adjustment: 0n }
      if (!rateAt) {
        const { complete, basis, market } = pnl.data.value
        return complete && basis !== null && market !== null
          ? { at: point.at, source: 'gateway', cost: basis, market, adjustment: market - basis }
          : null
      }
      const adjustment = revaluationOf(point.positions, (token) =>
        coinGeckoRateOfRecord(marketTargets.value.targets, rates.value, token, rateAt)
      )
      if (adjustment === null) return null
      const cost = safeCostAt(point.at)
      return { at: point.at, source: 'daily', cost, market: cost + adjustment, adjustment }
    })
  )
  const complete = computed(() => summaries.value.every((summary) => summary !== null))
  const loading = computed(
    () =>
      accounting.status.state.value === 'loading' ||
      !!pnl.isLoading.value ||
      assetMarkets.value.some((query) => query.isFetching) ||
      rates.value.some((query) => query.isFetching)
  )
  const entries = computed(() =>
    complete.value
      ? revaluationEntries(
          summaries.value.map((summary) => ({
            timestamp: summary!.at,
            adjustment: summary!.adjustment
          }))
        )
      : []
  )

  return {
    journal: computed(() =>
      entries.value.length
        ? [...accounting.journal.value, ...entries.value]
        : accounting.journal.value
    ),
    entries,
    summary: computed(() =>
      complete.value ? (summaries.value[summaries.value.length - 1] ?? null) : null
    ),
    status: computed<'ready' | 'loading' | 'unavailable'>(() =>
      complete.value ? 'ready' : loading.value ? 'loading' : 'unavailable'
    )
  }
}
