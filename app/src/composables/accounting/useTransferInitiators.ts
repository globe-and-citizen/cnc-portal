/**
 * Resolve the human who performed each internal transfer.
 *
 * A ledger transfer ("Bank → Safe") names two contract pockets, but the *person*
 * who performed it is the EOA that signed the transaction. The Safe Transaction
 * Service transfer feed carries only the `transactionHash`, so we resolve each
 * hash to its `from` (the signer) on-chain and key it by hash — letting the
 * ledger read "Stravid87 transferred money from Bank to Safe".
 *
 * A mined transaction's sender never changes, so the lookup is cached
 * indefinitely; every hash must resolve, and if any fail we surface them all
 * together as an `AggregateError` rather than silently dropping initiators.
 */
import { computed, type ComputedRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'

/** Map each transaction hash to the EOA that signed it (the transfer's initiator). */
export function useTransferInitiators(
  hashes: ComputedRef<readonly string[]>
): ComputedRef<Map<string, Address>> {
  const query = useQuery({
    queryKey: ['transfer-initiators', hashes],
    enabled: computed(() => hashes.value.length > 0),
    staleTime: Infinity,
    queryFn: async (): Promise<Map<string, Address>> => {
      const client = getPublicClient(config)
      if (!client) return new Map()
      const settled = await Promise.allSettled(
        hashes.value.map(async (hash) => {
          const tx = await client.getTransaction({ hash: hash as `0x${string}` })
          return [hash, tx.from] as const
        })
      )
      const errors = settled
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason)
      if (errors.length > 0) {
        throw new AggregateError(errors, `Failed to resolve ${errors.length} transfer initiator(s)`)
      }
      return new Map(
        settled
          .filter(
            (r): r is PromiseFulfilledResult<readonly [string, Address]> => r.status === 'fulfilled'
          )
          .map((r) => r.value)
      )
    }
  })

  return computed(() => query.data.value ?? new Map<string, Address>())
}
