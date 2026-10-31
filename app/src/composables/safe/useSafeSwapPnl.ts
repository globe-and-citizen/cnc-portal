import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import { useGetSafeTransfersQuery } from '@/queries/safe.queries'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import {
  useGetAssetMarketsQuery,
  useGetHistoricalTokenRatesQuery
} from '@/queries/coingecko.queries'
import { useGetCowTransactionOrdersQuery } from '@/queries/cow.queries'
import {
  buildSafeCostBasis,
  buildSafeSwapReport,
  safeCostBasisRateRequests,
  safeSwapCoinIds,
  safeSwapRateRequests,
  safeSwapTransfers
} from '@/utils/safe/swapValuation'
import { safeMovements } from '@/utils/safe/swapTransfers'
import type { SafeSwapPnl } from '@/utils/safe/swapPnl'
import type { SafeCostBasis } from '@/utils/safe/costBasis'

/**
 * Swap P&L of a Safe in USD, with the fees CoW Protocol reports. `data` compares what each swap
 * gave up, valued on its day, with what it received, valued today: the books replay it.
 * `costBasis` tracks every token the swaps touched at its weighted average cost: the Safe page
 * shows it. Both stay undefined until the history, balances, quotes and fee lookups have
 * settled, then keep their last settled value for the same Safe while any of them reloads, so
 * the figures never flicker or drop a fee. Switching or clearing the Safe discards them
 * immediately.
 */
export function useSafeSwapPnl(safeAddress: MaybeRefOrGetter<string | undefined>) {
  const today = new Date().toISOString().slice(0, 10)
  const transfers = useGetSafeTransfersQuery({ pathParams: { safeAddress } })
  const balances = useGetSafeBalancesQuery({ pathParams: { safeAddress, fiatCode: 'USD' } })

  const movements = computed(() => safeMovements(transfers.data.value, toValue(safeAddress)))
  const swaps = computed(() => safeSwapTransfers(transfers.data.value, toValue(safeAddress)))

  const heldBalances = computed(() =>
    (balances.data.value?.items ?? []).filter(({ fiatConversion }) => {
      const price = Number(fiatConversion)
      return Number.isFinite(price) && price > 0
    })
  )

  const markets = useGetAssetMarketsQuery(() =>
    [
      ...new Set(
        swaps.value
          .filter(({ type }) => type === 'ERC20_TRANSFER')
          .map(({ tokenAddress }) => tokenAddress!.toLowerCase())
      )
    ]
      .filter(
        (address) =>
          !SUPPORTED_TOKENS.some(
            (token) => token.address.toLowerCase() === address && token.coingeckoId !== 'unknown'
          )
      )
      .map((address) => ({ chainId: currentChainId, address }))
  )

  const coinIds = computed(() => safeSwapCoinIds(markets.value))
  const orders = useGetCowTransactionOrdersQuery(() => [
    ...new Set(swaps.value.map(({ transactionHash }) => transactionHash))
  ])
  const rates = useGetHistoricalTokenRatesQuery(() => {
    const address = toValue(safeAddress) ?? ''
    const requests = [
      ...safeSwapRateRequests(swaps.value, address, coinIds.value, heldBalances.value, today),
      ...safeCostBasisRateRequests(movements.value, {
        safeAddress: address,
        today,
        coinIds: coinIds.value,
        heldBalances: heldBalances.value,
        orders: orders.value
      })
    ]
    return [
      ...new Map(requests.map((request) => [`${request.coinId}:${request.date}`, request])).values()
    ]
  })

  const isLoading = computed(
    () =>
      transfers.isLoading.value ||
      balances.isLoading.value ||
      markets.value.some((market) => market.isLoading) ||
      rates.value.some((rate) => rate.isLoading) ||
      orders.value.some((order) => order.isLoading)
  )
  /** A failed refresh keeps the last answer; only a source that never answered is an error. */
  const isError = computed(
    () =>
      (!!transfers.error.value && !transfers.data.value) ||
      (!!balances.error.value && !balances.data.value)
  )
  const settled = computed<
    { address: string; report: SafeSwapPnl; costBasis: SafeCostBasis } | undefined
  >((previous) => {
    const address = toValue(safeAddress)?.toLowerCase()
    if (!address) return undefined
    if (isLoading.value) return previous?.address === address ? previous : undefined
    if (isError.value || !transfers.data.value) return undefined
    const sources = {
      safeAddress: address,
      today,
      coinIds: coinIds.value,
      heldBalances: heldBalances.value,
      rates: rates.value,
      orders: orders.value
    }
    return {
      address,
      report: buildSafeSwapReport(swaps.value, sources),
      costBasis: buildSafeCostBasis(movements.value, sources)
    }
  })
  const data = computed(() => settled.value?.report)
  const costBasis = computed(() => settled.value?.costBasis)

  return { data, costBasis, isLoading, isError }
}
