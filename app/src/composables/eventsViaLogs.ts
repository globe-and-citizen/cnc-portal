/**
 * Shared base for the "reconstruct a contract's event feed from the RPC" POC
 * (getLogs vs indexer). Handles the boilerplate common to Bank / Expense /
 * CashRemuneration / … :
 *   - getLogs on the contract from the deploy start block,
 *   - decode against a multi-version union ABI (a beacon proxy's logs span every
 *     implementation it ran, so we need all versions),
 *   - one immutable TanStack-cached block read for timestamps (logs don't carry
 *     them),
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
import { fetchBlockTimestamp } from '@/queries/blockTimestamp.queries'
import { queryClient } from '@/queries/queryClient'

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
  timestampGaps: TimestampGap[]
}

/** A decoded event withheld because its immutable block time was unavailable. */
export interface TimestampGap {
  transactionHash: string | null
  blockNumber: bigint | null
  reason: 'missing-block-number' | 'block-unavailable'
}

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

/** Stringify bigint event amounts for the client event-feed representation. */
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
  queryKey: MaybeRefOrGetter<string>
  /** Union of the contract's event fragments across versions. */
  eventAbi: Abi
  /** Fresh, empty event feed. */
  empty: () => T
  /** Fold one decoded contract log into the accumulator. */
  mapEvent: (ctx: EventMapContext<T>) => void
  /** Optional: fetch a second, already-filtered log set (e.g. FeePaid). */
  extraLogs?: (client: ChainClient, contract: Address) => Promise<readonly DecodedLogLike[]>
  /** Fold one `extraLogs` entry into the accumulator. */
  mapExtra?: (ctx: EventMapContext<T>) => void
}

type BlockTimestampResolver = (blockNumber: bigint) => Promise<number>

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
  opts: Pick<EventsViaLogsOptions<T>, 'eventAbi' | 'empty' | 'mapEvent' | 'extraLogs' | 'mapExtra'>,
  resolveBlockTimestamp: BlockTimestampResolver = async (blockNumber) => {
    const block = await client.getBlock({ blockNumber })
    return Number(block.timestamp)
  }
): Promise<ScanResult<T>> {
  if (targets.length === 0) return { data: opts.empty(), gaps: [], timestampGaps: [] }

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
  const timestampByBlock = new Map<bigint, number>()
  const fetched = await Promise.allSettled(
    blockNumbers.map(
      async (blockNumber) => [blockNumber, await resolveBlockTimestamp(blockNumber)] as const
    )
  )
  for (const result of fetched) {
    if (result.status === 'fulfilled') timestampByBlock.set(...result.value)
  }

  const out = opts.empty()
  const timestampGaps: TimestampGap[] = []

  const fold = (map: Map<string, TaggedLog>, mapFn?: (ctx: EventMapContext<T>) => void) => {
    if (!mapFn) return
    for (const { log, contract } of map.values()) {
      const timestamp = log.blockNumber == null ? undefined : timestampByBlock.get(log.blockNumber)
      if (timestamp === undefined) {
        timestampGaps.push({
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          reason: log.blockNumber == null ? 'missing-block-number' : 'block-unavailable'
        })
        continue
      }
      mapFn({
        out,
        id: `${log.transactionHash}-${log.logIndex}`,
        timestamp,
        contract,
        eventName: log.eventName ?? '',
        args: log.args ?? {},
        log
      })
    }
  }

  fold(mainById, opts.mapEvent)
  fold(extraById, opts.mapExtra)

  return { data: out, gaps, timestampGaps }
}

export function useContractEventsViaLogs<T>(opts: EventsViaLogsOptions<T>) {
  const targets = computed(() => normalizeTargets(toValue(opts.contractAddress)))
  const queryKey = computed(() => toValue(opts.queryKey))
  const targetKey = computed(() =>
    targets.value
      .map(({ address, fromBlock }) => ({
        address,
        fromBlock: (fromBlock ?? START_BLOCK).toString()
      }))
      .sort((left, right) => left.address.localeCompare(right.address))
  )

  const query = useQuery({
    queryKey: computed(() => [queryKey.value, { targets: targetKey.value }]),
    enabled: computed(() => targets.value.length > 0),
    staleTime: 30_000,
    queryFn: async (): Promise<ScanResult<T>> => {
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!client) throw new Error('No public client is available for the active chain')
      return scanContractLogs(client, targets.value, opts, (blockNumber) =>
        fetchBlockTimestamp(queryClient, client, currentChainId, blockNumber)
      )
    }
  })

  // `gaps` surfaces generations whose scan failed; `refetch` lets consumers
  // explicitly refresh the RPC log scan.
  return {
    result: computed(() => query.data.value?.data ?? null),
    gaps: computed<ScanGap[]>(() => query.data.value?.gaps ?? []),
    timestampGaps: computed<TimestampGap[]>(() => query.data.value?.timestampGaps ?? []),
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch
  }
}
