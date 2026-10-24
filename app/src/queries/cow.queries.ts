import { useQueries } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { currentChainId } from '@/constant'
import type { CowOrder } from '@/types/cow'
import { queryPresets } from './queryFactory'

/** CoW Protocol order-book networks, by chain id. */
const COW_NETWORKS: Record<number, string> = {
  1: 'mainnet',
  100: 'xdai',
  137: 'polygon',
  8453: 'base',
  42161: 'arbitrum_one',
  11155111: 'sepolia'
}

const cowKeys = {
  transactionOrders: (chainId: number, txHash: string) =>
    ['cow', 'transaction-orders', { chainId, txHash: txHash.toLowerCase() }] as const
}

/**
 * Orders settled by each transaction; an empty list means it was not a CoW settlement.
 * A settled transaction never changes, so each answer is kept for the session.
 * @endpoint GET https://api.cow.fi/{network}/api/v1/transactions/{txHash}/orders
 */
export function useGetCowTransactionOrdersQuery(txHashes: MaybeRefOrGetter<readonly string[]>) {
  const network = COW_NETWORKS[currentChainId]
  return useQueries({
    queries: computed(() =>
      toValue(txHashes).map((txHash) => ({
        ...queryPresets.once,
        queryKey: cowKeys.transactionOrders(currentChainId, txHash),
        enabled: !!network,
        gcTime: Infinity,
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const { data } = await externalApiClient.get<CowOrder[]>(
            `https://api.cow.fi/${network}/api/v1/transactions/${encodeURIComponent(txHash)}/orders`,
            { signal }
          )
          if (!Array.isArray(data)) throw new Error('CoW orders response unavailable')
          return data
        }
      }))
    ),
    combine: (queries) =>
      queries.map((query, index) => ({ ...query, txHash: toValue(txHashes)[index]! }))
  })
}
