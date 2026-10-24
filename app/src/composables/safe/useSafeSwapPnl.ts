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
    const address = toValue(safeAddress)?.toLowerCase()
    if (!address) return []
    const movements = (transfers.data.value ?? []).filter(
      ({ type, from, to, value, tokenAddress, tokenInfo }) =>
        type !== 'ERC721_TRANSFER' &&
        (from.toLowerCase() === address) !== (to.toLowerCase() === address) &&
        (type === 'ETHER_TRANSFER' || (!!tokenAddress && tokenInfo?.decimals !== undefined)) &&
        /^\d+$/.test(value) &&
        BigInt(value) > 0n
    )
    const swapHashes = new Set(
      movements
        .filter(
          (sent) =>
            sent.from.toLowerCase() === address &&
            movements.some(
              (received) =>
                received.transactionHash === sent.transactionHash &&
                received.to.toLowerCase() === address &&
                (received.type === 'ETHER_TRANSFER'
                  ? null
                  : received.tokenAddress?.toLowerCase()) !==
                  (sent.type === 'ETHER_TRANSFER' ? null : sent.tokenAddress?.toLowerCase())
            )
        )
        .map(({ transactionHash }) => transactionHash)
    )
    return movements.filter(({ transactionHash }) => swapHashes.has(transactionHash))
  })

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
      heldBalances: heldBalances.value,
      rates: rates.value,
      orders: orders.value
    })
  })

  return { data, isLoading, isError }
}
