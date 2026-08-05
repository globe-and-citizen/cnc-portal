import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { getLogs } from 'viem/actions'
import { parseEventLogs, type Address } from 'viem'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { EVENT_ABI } from '~/utils/contractEventsAbi'

// The CNC contracts were first deployed around this Polygon block; scanning from
// here (instead of genesis) keeps eth_getLogs fast and within RPC limits.
const DEPLOY_START_BLOCK = 79743826n

export interface DecodedLog {
  eventName: string
  args: Record<string, unknown>
  blockNumber: bigint
  transactionHash: string
  logIndex: number
}

/**
 * Read a contract's event logs from the RPC (Alchemy, indexed by address) and
 * decode them against the union event ABI. Newest first. `enabled` gates the
 * request so it only fires on demand (e.g. when a modal opens).
 */
export const useContractLogsQuery = (
  address: MaybeRefOrGetter<string | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true
) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  return useQuery({
    queryKey: ['contract-logs', { address: toValue(address) }],
    queryFn: async (): Promise<DecodedLog[]> => {
      const target = toValue(address)
      if (!client.value || !target) return []

      const logs = await getLogs(client.value, {
        address: target as Address,
        fromBlock: DEPLOY_START_BLOCK,
        toBlock: 'latest'
      })

      const decoded = parseEventLogs({ abi: EVENT_ABI, logs })

      return decoded
        .map(log => ({
          eventName: log.eventName as string,
          args: (log.args ?? {}) as Record<string, unknown>,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '',
          logIndex: log.logIndex ?? 0
        }))
        .sort((a, b) =>
          a.blockNumber === b.blockNumber
            ? b.logIndex - a.logIndex
            : Number(b.blockNumber - a.blockNumber)
        )
    },
    enabled: () => !!toValue(address) && !!toValue(enabled),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60
  })
}
