/**
 * Shared base for the "reconstruct a contract's event feed from the RPC" POC
 * (getLogs vs indexer). Handles the boilerplate common to Bank / Expense /
 * CashRemuneration / … :
 *   - getLogs on the contract from the deploy start block,
 *   - decode against a multi-version union ABI (a beacon proxy's logs span every
 *     implementation it ran, so we need all versions),
 *   - a getBlock per *uncached* block for timestamps (logs don't carry them; a
 *     process-wide cache dedupes blocks across feeds and refetches),
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

/**
 * Shared block-number → Unix-seconds cache. A mined block's timestamp never
 * changes, so it is memoised process-wide and reused across every contract feed
 * and every refetch: a block that several feeds touch (or the same feed re-scans)
 * is fetched from the RPC only once, instead of one `getBlock` per contract and
 * again on each re-scan. Keyed by chain so it stays correct if the active chain
 * changes within a session.
 */
const blockTimestampCache = new Map<string, number>()
const blockCacheKey = (blockNumber: bigint): string => `${currentChainId}-${blockNumber}`

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

      // Timestamps for each unique block the logs touch (logs carry none). Only
      // blocks missing from the shared cache are fetched; with the transport's
      // batching those `getBlock` calls collapse into a single JSON-RPC POST.
      const blockNumbers = [
        ...new Set(
          [...decoded, ...extra].map((l) => l.blockNumber).filter((b): b is bigint => b != null)
        )
      ]
      const uncached = blockNumbers.filter((n) => !blockTimestampCache.has(blockCacheKey(n)))
      const fetched = await Promise.all(
        uncached.map((blockNumber) => client.getBlock({ blockNumber }))
      )
      for (const block of fetched) {
        blockTimestampCache.set(blockCacheKey(block.number), Number(block.timestamp))
      }
      const tsOf = (blockNumber: bigint | null) =>
        blockNumber == null ? 0 : (blockTimestampCache.get(blockCacheKey(blockNumber)) ?? 0)

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
