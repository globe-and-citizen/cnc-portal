/**
 * Payment Gate history isn't a separate backend record — it's just the
 * Bank's `depositToken` transactions whose calldata carries a facture ID
 * (see `utils/paymentGate/factureCalldata.ts`). This fetches the Bank's
 * token deposits, resolves each transaction's raw calldata, and keeps only
 * the ones the widget actually paid.
 *
 * Every row here is a confirmed on-chain deposit event — there's no
 * pending/failed state to represent; a reverted or still-pending payment
 * never emitted the event this reads in the first place. Read availability is
 * separate: unresolved calldata or event-source gaps keep history incomplete.
 *
 * Shaped as `TransactionHistoryItemRow` (plus `factureId`) so the history
 * card can render and link out to `TransactionDetailSlideover` exactly like
 * every other transaction table in the app.
 */
import { computed, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import { formatUnits, isHex, type Address, type Hex } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import { getEventFeedStatus, type EventFeedState } from '@/composables/eventsViaLogs'
import { decodeFactureIdFromCalldata } from '@/utils/paymentGate/factureCalldata'
import { extractTxHashFromId } from '@/utils/transactions/raw'
import { formatBankTransactionDate } from '@/utils/transactions/bank'
import { useBankEventsViaLogs } from '@/composables/bank/useBankEventsViaLogs'
import type { TransactionHistoryItemRow } from '@/types/transaction-history'

export interface FacturePayment extends TransactionHistoryItemRow {
  factureId: string
}

export function useFactureHistory(bankAddress: MaybeRefOrGetter<Address | undefined>) {
  const events = useBankEventsViaLogs(bankAddress)

  const tokenDeposits = computed(() => events.data.value?.events.bankTokenDeposits.items ?? [])
  const depositHashes = computed(() => [
    ...new Set(tokenDeposits.value.map((item) => extractTxHashFromId(item.id)))
  ])

  // Successful transaction input is immutable and shared by chain/hash. A failed
  // lookup remains an error in its own query, rather than a cached missing payment.
  const calldataQueries = useQueries({
    queries: computed(() =>
      depositHashes.value.map((hash) => ({
        queryKey: ['payment-gate-facture-calldata', currentChainId, hash] as const,
        staleTime: Infinity,
        retry: false,
        queryFn: async () => {
          const client = getPublicClient(config, { chainId: currentChainId })
          if (!client) throw new Error('No public client is available for payment history')
          const tx = await client.getTransaction({ hash: hash as Hex })
          if (!isHex(tx.input))
            throw new Error('Transaction input is unavailable for payment history')
          return { hash, input: tx.input }
        }
      }))
    )
  })
  const calldataByHash = computed(
    () =>
      new Map(
        calldataQueries.value.flatMap(({ data }) =>
          data ? [[data.hash, data.input] as const] : []
        )
      )
  )
  const unresolvedHashes = computed(() =>
    depositHashes.value.filter((hash) => !calldataByHash.value.has(hash))
  )
  const payments = computed<FacturePayment[]>(() => {
    return tokenDeposits.value.flatMap((item): FacturePayment[] => {
      const txHash = extractTxHashFromId(item.id)
      const calldata = calldataByHash.value.get(txHash)
      const factureId = calldata && decodeFactureIdFromCalldata(calldata)
      if (!factureId) return []

      const token = SUPPORTED_TOKENS.find(
        (candidate) => candidate.address.toLowerCase() === item.token.toLowerCase()
      )

      return [
        {
          factureId,
          txHash: txHash as Hex,
          date: formatBankTransactionDate(Number(item.timestamp)),
          from: item.depositor,
          to: item.contractAddress,
          amount: token ? formatUnits(BigInt(item.amount), token.decimals) : item.amount,
          amountUSD: 0,
          tokenAddress: item.token,
          token: token?.symbol ?? item.token,
          type: 'tokenDeposit'
        }
      ]
    })
  })

  const sourceStatus = computed(() =>
    getEventFeedStatus({
      data: events.data.value,
      error: events.error.value,
      isPending: events.isPending.value
    })
  )
  const status = computed(() => {
    const queries = calldataQueries.value
    let state: EventFeedState = sourceStatus.value.state
    if (state === 'complete' && unresolvedHashes.value.length > 0) {
      const hasResolved = queries.some(({ data }) => data !== undefined)
      const initialLoading =
        queries.some(({ isPending }) => isPending) && !queries.some(({ isError }) => isError)
      state = initialLoading ? 'loading' : hasResolved ? 'partial' : 'unavailable'
    }
    return {
      ...sourceStatus.value,
      state,
      queryErrorCount:
        sourceStatus.value.queryErrorCount + queries.filter(({ isError }) => isError).length,
      fetching:
        events.isPending.value ||
        events.isRefetching.value ||
        queries.some(({ isFetching }) => isFetching),
      error: events.error.value ?? queries.find(({ isError }) => isError)?.error ?? null
    }
  })
  const refetch = () =>
    Promise.all([
      ...(sourceStatus.value.state === 'partial' || sourceStatus.value.state === 'unavailable'
        ? [events.refetch({ cancelRefetch: false })]
        : []),
      ...calldataQueries.value
        .filter(({ data, isFetching }) => data === undefined && !isFetching)
        .map((query) => query.refetch({ cancelRefetch: false }))
    ])

  // This read model combines Bank-feed and calldata availability; each source's
  // query remains the owner of its cache, errors and retries.
  return {
    data: computed(() => ({ payments: payments.value, unresolvedHashes: unresolvedHashes.value })),
    status,
    refetch
  }
}
