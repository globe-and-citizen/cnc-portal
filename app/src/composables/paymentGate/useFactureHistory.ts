/**
 * Payment Gate history isn't a separate backend record — it's just the
 * Bank's `depositToken` transactions whose calldata carries a facture ID
 * (see `utils/paymentGate/factureCalldata.ts`). This fetches the Bank's
 * token deposits, resolves each transaction's raw calldata, and keeps only
 * the ones the widget actually paid.
 *
 * Every row here is a confirmed on-chain deposit event — there's no
 * pending/failed state to represent; a reverted or still-pending payment
 * never emitted the event this reads in the first place.
 */
import { computed, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import type { Address, Hex } from 'viem'
import { config } from '@/wagmi.config'
import { SUPPORTED_TOKENS } from '@/constant'
import { formatTokenUnits } from '@/utils/format'
import { decodeFactureIdFromCalldata } from '@/utils/paymentGate/factureCalldata'
import { extractTxHashFromId } from '@/utils/rawTransactionsUtil'
import { useBankEventsViaLogs } from '@/composables/bank/useBankEventsViaLogs'

export interface FacturePayment {
  factureId: string
  amount: string
  token: string
  txHash: Hex
}

export function useFactureHistory(bankAddress: MaybeRefOrGetter<Address | undefined>) {
  const events = useBankEventsViaLogs(bankAddress)

  const tokenDeposits = computed(() => events.result.value?.bankTokenDeposits.items ?? [])
  const depositHashes = computed(() => [
    ...new Set(tokenDeposits.value.map((item) => extractTxHashFromId(item.id)))
  ])

  // One raw-calldata lookup per deposit hash — the events feed only carries
  // decoded args, not the calldata the facture ID rides in.
  const calldataQuery = useQuery({
    queryKey: ['payment-gate-facture-calldata', depositHashes],
    enabled: computed(() => depositHashes.value.length > 0),
    staleTime: Infinity,
    queryFn: async (): Promise<Map<string, Hex>> => {
      const client = getPublicClient(config)
      if (!client) return new Map()
      const settled = await Promise.allSettled(
        depositHashes.value.map(async (hash) => {
          const tx = await client.getTransaction({ hash: hash as Hex })
          return [hash, tx.input] as const
        })
      )
      return new Map(
        settled
          .filter(
            (r): r is PromiseFulfilledResult<readonly [string, Hex]> => r.status === 'fulfilled'
          )
          .map((r) => r.value)
      )
    }
  })

  const payments = computed<FacturePayment[]>(() => {
    const calldataByHash = calldataQuery.data.value ?? new Map<string, Hex>()

    return tokenDeposits.value.flatMap((item): FacturePayment[] => {
      const txHash = extractTxHashFromId(item.id)
      const calldata = calldataByHash.get(txHash)
      const factureId = calldata && decodeFactureIdFromCalldata(calldata)
      if (!factureId) return []

      const token = SUPPORTED_TOKENS.find(
        (candidate) => candidate.address.toLowerCase() === item.token.toLowerCase()
      )

      return [
        {
          factureId,
          amount: token
            ? formatTokenUnits(BigInt(item.amount), token.decimals, token.symbol)
            : item.amount,
          token: token?.symbol ?? item.token,
          txHash: txHash as Hex
        }
      ]
    })
  })

  return {
    payments,
    loading: computed(() => events.loading.value || calldataQuery.isPending.value),
    error: computed(() => events.error.value ?? calldataQuery.error.value)
  }
}
