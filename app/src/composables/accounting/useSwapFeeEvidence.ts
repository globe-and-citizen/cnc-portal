import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { SwapFeeAmount, SwapFeeEvidence, SwapFeeTarget } from '@/types/swapFees'
import { currentChainId } from '@/constant'
import {
  useGetCowOrdersQuery,
  useGetCowTradesQuery,
  useGetSwapExecutionsQuery
} from '@/queries/swapFees.queries'
import {
  cowApiUrl,
  matchesCowOrder,
  safeCowTrades,
  verifyCowFees
} from '@/utils/safe/cowSettlement'

/**
 * Settlement receipts and CoW fee records of the Safe swaps, verified per swap.
 * Only a settled single-token fee is separated from the asset cost; anything unverified
 * stays inside that cost and never blocks the books. Retry re-reads provider records,
 * which may still be indexing, and only the receipts that failed.
 */
export function useSwapFeeEvidence(targets: MaybeRefOrGetter<readonly SwapFeeTarget[]>) {
  const executions = useGetSwapExecutionsQuery(() =>
    toValue(targets).map((target) => target.txHash)
  )
  const executionOf = (target: SwapFeeTarget) => {
    const query = executions.value.find((query) => query.hash === target.txHash.toLowerCase())
    return query?.isError ? undefined : query?.data
  }
  const settled = computed(() =>
    toValue(targets).flatMap((target) => {
      const execution = executionOf(target)
      return execution && cowApiUrl(execution.chainId) && safeCowTrades(target, execution).length
        ? [{ target, execution }]
        : []
    })
  )
  const chainId = () => settled.value[0]?.execution.chainId ?? currentChainId
  const orders = useGetCowOrdersQuery({
    chainId,
    hashes: () => settled.value.map(({ execution }) => execution.transactionHash)
  })
  const ordersOf = (hash: string) =>
    orders.value.find((query) => query.hash === hash && !query.isError)?.data ?? []
  const trades = useGetCowTradesQuery({
    chainId,
    orderUids: () =>
      settled.value.flatMap(({ target, execution }) =>
        ordersOf(execution.transactionHash)
          .filter((order) =>
            safeCowTrades(target, execution).some((trade) =>
              matchesCowOrder(order, trade, target.safeAddress)
            )
          )
          .map((order) => order.uid)
      )
  })

  const data = computed<SwapFeeEvidence[]>(() =>
    toValue(targets).map((target) => {
      const receipt = executions.value.find((query) => query.hash === target.txHash.toLowerCase())
      const execution = executionOf(target)
      const order = orders.value.find((query) => query.hash === execution?.transactionHash)
      const uids = new Set(safeCowTrades(target, execution).map((trade) => trade.orderUid))
      const fills = trades.value.filter((query) => uids.has(query.orderUid))
      return {
        target,
        execution,
        loading: !!receipt?.isFetching || !!order?.isFetching || fills.some((q) => q.isFetching),
        failed: !!receipt?.isError || !!order?.isError || fills.some((q) => q.isError),
        verification: verifyCowFees(
          target,
          execution,
          execution ? ordersOf(execution.transactionHash) : [],
          fills.filter((query) => !query.isError).flatMap((query) => query.data ?? [])
        )
      }
    })
  )

  const verifiedFees = computed(() => {
    const fees = new Map<string, SwapFeeAmount>()
    for (const { target, loading, failed, verification } of data.value) {
      if (!loading && !failed && verification.fees?.length === 1)
        fees.set(target.txHash.toLowerCase(), verification.fees[0]!)
    }
    return fees
  })

  const refetch = () =>
    Promise.allSettled(
      [...executions.value.filter((query) => query.isError), ...orders.value, ...trades.value].map(
        (query) => query.refetch()
      )
    )
  return { data, verifiedFees, refetch }
}
