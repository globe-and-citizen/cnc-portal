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
  buildSafeSwapReport,
  safeSwapCoinIds,
  safeSwapRateRequests,
  safeSwapTransfers
} from '@/utils/safe/swapValuation'
import type { SafeSwapPnl } from '@/utils/safe/swapPnl'

/**
 * Swap P&L of a Safe in USD: what its swaps gave up, valued on their day, against what the
 * assets received are worth today, with the fees CoW Protocol reports. `data` stays undefined
 * until the history, balances, quotes and fee lookups have settled, then keeps its last
 * settled value for the same Safe while any of them reloads, so the figure never flickers
 * or drops a fee. Switching or clearing the Safe discards that value immediately.
 */
export function useSafeSwapPnl(safeAddress: MaybeRefOrGetter<string | undefined>) {
  const today = new Date().toISOString().slice(0, 10)
  const transfers = useGetSafeTransfersQuery({ pathParams: { safeAddress } })
  const balances = useGetSafeBalancesQuery({ pathParams: { safeAddress, fiatCode: 'USD' } })

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
  const rates = useGetHistoricalTokenRatesQuery(() =>
    safeSwapRateRequests(
      swaps.value,
      toValue(safeAddress) ?? '',
      coinIds.value,
      heldBalances.value,
      today
    )
  )
  const orders = useGetCowTransactionOrdersQuery(() => [
    ...new Set(swaps.value.map(({ transactionHash }) => transactionHash))
  ])

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
  const settled = computed<{ address: string; report: SafeSwapPnl } | undefined>((previous) => {
    const address = toValue(safeAddress)?.toLowerCase()
    if (!address) return undefined
    if (isLoading.value) return previous?.address === address ? previous : undefined
    if (isError.value || !transfers.data.value) return undefined
    return {
      address,
      report: buildSafeSwapReport(swaps.value, {
        safeAddress: address,
        today,
        coinIds: coinIds.value,
        heldBalances: heldBalances.value,
        rates: rates.value,
        orders: orders.value
      })
    }
  })
  const data = computed(() => settled.value?.report)

  return { data, isLoading, isError }
}
