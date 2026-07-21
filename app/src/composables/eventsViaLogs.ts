/**
 * Shared base for the "reconstruct a contract's event feed from the RPC" POC
 * (getLogs vs indexer). Handles the boilerplate common to Bank / Expense /
 * CashRemuneration / … :
 *   - getLogs on the contract from the deploy start block,
 *   - decode against a multi-version union ABI (a beacon proxy's logs span every
 *     implementation it ran, so we need all versions),
 *   - one getBlock per unique block for timestamps (logs don't carry them),
 *   - iterate the decoded logs through a caller-supplied `mapEvent`.
 *
 * Optionally, `extraLogs` fetches a second, already-filtered log set (e.g. the
 * global FeeCollector's FeePaid for this contract) that's mapped via `mapExtra`
 * and folded into the same timestamp batch.
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import { parseEventLogs, type Abi, type AbiEvent, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId } from '@/constant'

// CNC contracts were first deployed around this Polygon block — scan from here.
// On other chains (local Hardhat, testnets) the deployment starts near genesis,
// so scan from block 0; a Polygon-only start block there yields an empty range.
const POLYGON_START_BLOCK = 79743826n
export const START_BLOCK = currentChainId === 137 ? POLYGON_START_BLOCK : 0n

/** Concatenate several ABIs into a single event ABI, deduped by signature. */
export function unionEventAbi(abis: unknown[]): Abi {
  const seen = new Set<string>()
  const events: AbiEvent[] = []
  for (const abi of abis as AbiEvent[][]) {
    for (const item of abi) {
      if (item?.type !== 'event') continue
      const sig = `${item.name}(${(item.inputs ?? []).map((i) => i.type).join(',')})`
      if (seen.has(sig)) continue
      seen.add(sig)
      events.push(item)
    }
  }
  return events
}

/** Stringify bigints (amounts) the way Ponder returns them. */
export const str = (v: unknown): string => (typeof v === 'bigint' ? v.toString() : String(v))

export type ChainClient = NonNullable<ReturnType<typeof getPublicClient>>

// A log carrying decoded args — covers both parseEventLogs output and the
// event-filtered getLogs used by `extraLogs`.
export interface DecodedLogLike {
  eventName?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
  address: string
  blockNumber: bigint | null
  transactionHash: string | null
  logIndex: number | null
}

export interface EventMapContext<T> {
  out: T
  id: string
  timestamp: number
  contract: Address
  eventName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
  log: DecodedLogLike
}

export interface EventsViaLogsOptions<T> {
  contractAddress: MaybeRefOrGetter<string | undefined>
  /** Cache-key prefix, e.g. 'bank-events-logs'. */
  queryKey: string
  /** Union of the contract's event fragments across versions. */
  eventAbi: Abi
  /** Fresh, empty result matching the Ponder query shape. */
  empty: () => T
  /** Fold one decoded contract log into the accumulator. */
  mapEvent: (ctx: EventMapContext<T>) => void
  /** Optional: fetch a second, already-filtered log set (e.g. FeePaid). */
  extraLogs?: (client: ChainClient, contract: Address) => Promise<readonly DecodedLogLike[]>
  /** Fold one `extraLogs` entry into the accumulator. */
  mapExtra?: (ctx: EventMapContext<T>) => void
}

export function useContractEventsViaLogs<T>(opts: EventsViaLogsOptions<T>) {
  const address = computed(() => toValue(opts.contractAddress)?.toLowerCase())

  const query = useQuery({
    queryKey: computed(() => [opts.queryKey, address.value]),
    enabled: computed(() => !!address.value),
    staleTime: 30_000,
    queryFn: async (): Promise<T> => {
      const contract = address.value as Address
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!client || !contract) return opts.empty()

      const rawLogs = await client.getLogs({
        address: contract,
        fromBlock: START_BLOCK,
        toBlock: 'latest'
      })
      const decoded = parseEventLogs({ abi: opts.eventAbi, logs: rawLogs, strict: false })
      const extra = opts.extraLogs ? await opts.extraLogs(client, contract) : []

      // One getBlock per unique block (contract + extra logs) for timestamps.
      const blockNumbers = [
        ...new Set(
          [...decoded, ...extra].map((l) => l.blockNumber).filter((b): b is bigint => b != null)
        )
      ]
      const blocks = await Promise.all(
        blockNumbers.map((blockNumber) => client.getBlock({ blockNumber }))
      )
      const tsByBlock = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]))
      const tsOf = (blockNumber: bigint | null) => tsByBlock.get(blockNumber ?? 0n) ?? 0

      const out = opts.empty()

      for (const log of decoded as unknown as DecodedLogLike[]) {
        opts.mapEvent({
          out,
          id: `${log.transactionHash}-${log.logIndex}`,
          timestamp: tsOf(log.blockNumber),
          contract,
          eventName: log.eventName ?? '',
          args: log.args ?? {},
          log
        })
      }

      if (opts.mapExtra) {
        for (const log of extra) {
          opts.mapExtra({
            out,
            id: `${log.transactionHash}-${log.logIndex}`,
            timestamp: tsOf(log.blockNumber),
            contract,
            eventName: log.eventName ?? '',
            args: log.args ?? {},
            log
          })
        }
      }

      return out
    }
  })

  // Mirror @vue/apollo-composable's shape so it drops into the *Transactions.vue.
  // `refetch` is exposed so consumers (e.g. useCNCAccounting's refresh) can force
  // a re-scan the same way they did with the Apollo queries.
  return {
    result: query.data,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch
  }
}
