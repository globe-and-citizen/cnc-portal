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
 *
 * The address input accepts a single address or an array of {@link ScanTarget}s
 * (one per contract generation, each with its own deploy boundary); logs from
 * every generation are merged and deduplicated on `txHash-logIndex` (#2456).
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
 * One contract generation to scan: its address plus the block its deployment
 * boundary starts at. `fromBlock` defaults to {@link START_BLOCK} when omitted
 * (e.g. a legacy Officer with no recorded deploy block).
 */
export interface ScanTarget {
  address: string
  fromBlock?: bigint
}

/** What a feed accepts as its address input: one address, or many generations. */
export type ContractAddressInput = string | undefined | readonly ScanTarget[]

/**
 * A generation whose scan failed (e.g. the RPC rejected). Surfaced so the
 * accounting UI can flag a reconciliation gap instead of silently dropping a
 * whole contract type (issue #2456).
 */
export interface ScanGap {
  address: string
  error: unknown
}

/** What {@link scanContractLogs} returns: the merged feed plus any failed generations. */
export interface ScanResult<T> {
  data: T
  gaps: ScanGap[]
}

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
  /** A single contract address, or one {@link ScanTarget} per generation. */
  contractAddress: MaybeRefOrGetter<ContractAddressInput>
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

/** Normalize the address input to a deduped list of lower-cased scan targets. */
function normalizeTargets(input: ContractAddressInput): ScanTarget[] {
  const raw: readonly ScanTarget[] =
    typeof input === 'string' ? [{ address: input }] : Array.isArray(input) ? input : []
  const byAddress = new Map<string, ScanTarget>()
  for (const target of raw) {
    const address = target.address?.toLowerCase()
    if (!address) continue
    const existing = byAddress.get(address)
    const fromBlock = target.fromBlock ?? START_BLOCK
    if (!existing || fromBlock < (existing.fromBlock ?? START_BLOCK)) {
      byAddress.set(address, { address, fromBlock })
    }
  }
  return [...byAddress.values()]
}

/**
 * A decoded log tagged with the generation address it was fetched for, so
 * `extraLogs` entries (emitted by another contract, e.g. the FeeCollector) still
 * know which scanned contract they belong to.
 */
interface TaggedLog {
  log: DecodedLogLike
  contract: Address
}

/**
 * Scan every target from its deploy boundary, merge and deduplicate the logs on
 * `txHash-logIndex`, resolve block timestamps, and fold each into the accumulator
 * via `mapEvent` / `mapExtra`. Pure over its injected client so it is unit-tested
 * without Vue or a live RPC (issue #2456).
 *
 * Each generation is scanned in isolation: a target whose RPC scan fails is
 * recorded as a {@link ScanGap} and skipped, so the generations that did load are
 * still returned rather than the whole feed being lost.
 */
export async function scanContractLogs<T>(
  client: ChainClient,
  targets: readonly ScanTarget[],
  opts: Pick<EventsViaLogsOptions<T>, 'eventAbi' | 'empty' | 'mapEvent' | 'extraLogs' | 'mapExtra'>
): Promise<ScanResult<T>> {
  if (targets.length === 0) return { data: opts.empty(), gaps: [] }

  const mainById = new Map<string, TaggedLog>()
  const extraById = new Map<string, TaggedLog>()
  const gaps: ScanGap[] = []

  await Promise.all(
    targets.map(async ({ address, fromBlock }) => {
      const contract = address as Address
      try {
        const rawLogs = await client.getLogs({
          address: contract,
          fromBlock: fromBlock ?? START_BLOCK,
          toBlock: 'latest'
        })
        const decoded = parseEventLogs({
          abi: opts.eventAbi,
          logs: rawLogs,
          strict: false
        }) as unknown as DecodedLogLike[]
        for (const log of decoded) {
          mainById.set(`${log.transactionHash}-${log.logIndex}`, { log, contract })
        }

        if (opts.extraLogs) {
          const extra = await opts.extraLogs(client, contract)
          for (const log of extra) {
            extraById.set(`${log.transactionHash}-${log.logIndex}`, { log, contract })
          }
        }
      } catch (error) {
        gaps.push({ address, error })
      }
    })
  )

  const allTagged = [...mainById.values(), ...extraById.values()]

  const blockNumbers = [
    ...new Set(allTagged.map((t) => t.log.blockNumber).filter((b): b is bigint => b != null))
  ]
  const uncached = blockNumbers.filter((n) => !blockTimestampCache.has(blockCacheKey(n)))
  const fetched = await Promise.allSettled(
    uncached.map((blockNumber) => client.getBlock({ blockNumber }))
  )
  for (const result of fetched) {
    if (result.status === 'fulfilled') {
      blockTimestampCache.set(blockCacheKey(result.value.number), Number(result.value.timestamp))
    }
  }
  const tsOf = (blockNumber: bigint | null) =>
    blockNumber == null ? 0 : (blockTimestampCache.get(blockCacheKey(blockNumber)) ?? 0)

  const out = opts.empty()

  const fold = (map: Map<string, TaggedLog>, mapFn?: (ctx: EventMapContext<T>) => void) => {
    if (!mapFn) return
    for (const { log, contract } of map.values()) {
      mapFn({
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

  fold(mainById, opts.mapEvent)
  fold(extraById, opts.mapExtra)

  return { data: out, gaps }
}

export function useContractEventsViaLogs<T>(opts: EventsViaLogsOptions<T>) {
  const targets = computed(() => normalizeTargets(toValue(opts.contractAddress)))
  const addressKey = computed(() =>
    targets.value
      .map((t) => t.address)
      .sort()
      .join(',')
  )

  const query = useQuery({
    queryKey: computed(() => [opts.queryKey, addressKey.value]),
    enabled: computed(() => targets.value.length > 0),
    staleTime: 30_000,
    queryFn: async (): Promise<ScanResult<T>> => {
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!client) return { data: opts.empty(), gaps: [] }
      return scanContractLogs(client, targets.value, opts)
    }
  })

  // Mirror @vue/apollo-composable's shape so it drops into the *Transactions.vue.
  // `gaps` surfaces generations whose scan failed; `refetch` lets consumers force
  // a re-scan the same way they did with the Apollo queries.
  return {
    result: computed(() => query.data.value?.data ?? null),
    gaps: computed<ScanGap[]>(() => query.data.value?.gaps ?? []),
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch
  }
}
