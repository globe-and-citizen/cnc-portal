/** Immutable block-timestamp reads shared through the TanStack Query cache. */
import type { QueryClient } from '@tanstack/vue-query'

interface BlockTimestampClient {
  getBlock(parameters: { blockNumber: bigint }): Promise<{
    number: bigint | null
    timestamp: bigint
  }>
}

export const blockTimestampKeys = {
  all: ['block-timestamp'] as const,
  timestamp: (chainId: number, blockNumber: bigint) =>
    [...blockTimestampKeys.all, { chainId, blockNumber: blockNumber.toString() }] as const
}

/**
 * Resolve one mined block timestamp once per chain and block number.
 *
 * A mined block is immutable, so both staleness and garbage-collection are
 * disabled. Concurrent callers also share TanStack Query's in-flight request.
 */
export async function fetchBlockTimestamp(
  queryClient: QueryClient,
  client: BlockTimestampClient,
  chainId: number,
  blockNumber: bigint
): Promise<number> {
  return queryClient.fetchQuery({
    queryKey: blockTimestampKeys.timestamp(chainId, blockNumber),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const block = await client.getBlock({ blockNumber })
      const timestamp = Number(block.timestamp)
      if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
        throw new Error(`Block ${blockNumber} returned an invalid timestamp`)
      }
      return timestamp
    }
  })
}
