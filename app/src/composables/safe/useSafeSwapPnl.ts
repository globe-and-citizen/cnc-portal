import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { currentChainId } from '@/constant'
import { useGetSafeTransfersQuery } from '@/queries/safe.queries'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import {
  useGetAssetMarketsQuery,
  useGetHistoricalTokenRatesQuery
} from '@/queries/coingecko.queries'
import { useGetCowTransactionOrdersQuery } from '@/queries/cow.queries'
import { toSafeSwaps } from '@/utils/safe/swapPnl'
import {
  buildSafeSwapReport,
  safeHeldPrices,
  safeSwapCoinIds,
  safeSwapContracts,
  safeSwapRateRequests
} from '@/utils/safe/swapValuation'

/**
 * Swap P&L of a Safe in USD: what its swaps gave up, valued on their day, against what the
 * assets received are worth today, with the fees CoW Protocol reports. `data` stays undefined
 * until the history, balances and quotes have settled; fee lookups never block it.
 */
export function useSafeSwapPnl(safeAddress: MaybeRefOrGetter<string | undefined>) {
  const today = new Date().toISOString().slice(0, 10)
  const transfers = useGetSafeTransfersQuery({ pathParams: { safeAddress } })
  const balances = useGetSafeBalancesQuery({ pathParams: { safeAddress, fiatCode: 'USD' } })

  const swaps = computed(() => {
    const address = toValue(safeAddress)
    return address && transfers.data.value ? toSafeSwaps(transfers.data.value, address) : []
  })
  const heldPrices = computed(() => safeHeldPrices(balances.data.value))
  const markets = useGetAssetMarketsQuery(() =>
    safeSwapContracts(swaps.value).map((address) => ({ chainId: currentChainId, address }))
  )
  const coinIds = computed(() => safeSwapCoinIds(markets.value))
  const rates = useGetHistoricalTokenRatesQuery(() =>
    safeSwapRateRequests(swaps.value, coinIds.value, heldPrices.value, today)
  )
  const orders = useGetCowTransactionOrdersQuery(() => swaps.value.map(({ txHash }) => txHash))

  const isLoading = computed(
    () =>
      transfers.isLoading.value ||
      balances.isLoading.value ||
      markets.value.some((market) => market.isLoading) ||
      rates.value.some((rate) => rate.isLoading)
  )
  const isError = computed(() => !!transfers.error.value || !!balances.error.value)
  const data = computed(() => {
    const safeAddressValue = toValue(safeAddress)
    if (isLoading.value || isError.value || !safeAddressValue || !transfers.data.value)
      return undefined
    return buildSafeSwapReport(swaps.value, {
      safeAddress: safeAddressValue,
      today,
      coinIds: coinIds.value,
      heldPrices: heldPrices.value,
      rates: rates.value,
      orders: orders.value
    })
  })

  return { data, isLoading, isError }
}
