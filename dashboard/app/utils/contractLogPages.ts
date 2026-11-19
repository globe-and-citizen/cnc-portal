import { parseEventLogs, type Address, type Log } from 'viem'
import { EVENT_ABIS } from '~/utils/contractEventsAbi'

// Limit work per click; carry the successful range size forward to older pages.
const INITIAL_WINDOW = 500_000n
const MAX_RANGES = 5
const MAX_ATTEMPTS = 18

export interface ContractLogRow {
  eventName: string
  args: Record<string, unknown>
  blockNumber: bigint | null
  transactionHash: string | null
  logIndex: number | null
  decoded: boolean
}

export interface LogCursor {
  toBlock: string
  window: string
}

export interface ContractLogPage {
  rows: ContractLogRow[]
  next: LogCursor | null
  failed: boolean
  scannedFrom: bigint | null
  scannedTo: bigint | null
}

type ReadLogs = (range: { address: Address, fromBlock: bigint, toBlock: bigint }) => Promise<readonly Log[]>

function isRangeLimit(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /block range|range.{0,30}(too (large|wide)|exceed|limit)|too many (results|logs)|response size|query returned more than/i.test(message)
}

function decode(log: Log): ContractLogRow {
  for (const abi of EVENT_ABIS) {
    let match
    try {
      match = parseEventLogs({ abi, logs: [log] })[0]
    } catch {
      continue
    }
    if (match) {
      return {
        eventName: match.eventName,
        args: (match.args ?? {}) as Record<string, unknown>,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        decoded: true
      }
    }
  }
  return {
    eventName: 'Unrecognized event',
    args: { topics: log.topics, data: log.data },
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    decoded: false
  }
}

/** Scan a bounded set of contiguous ranges from newest to oldest, retaining
 * successful ranges if a later range fails. Genesis is the only safe universal
 * lower bound: imported contracts can predate the CNC deployments. */
export async function fetchContractLogPage(
  address: Address,
  cursor: LogCursor,
  readLogs: ReadLogs
): Promise<ContractLogPage> {
  let toBlock = BigInt(cursor.toBlock)
  let window = BigInt(cursor.window)
  let scannedFrom: bigint | null = null
  let scannedTo: bigint | null = null
  let attempts = 0
  let ranges = 0
  const logs: Log[] = []
  let failed = false

  while (toBlock >= 0n && ranges < MAX_RANGES && attempts < MAX_ATTEMPTS) {
    const fromBlock = toBlock >= window - 1n ? toBlock - window + 1n : 0n
    attempts++
    try {
      const result = await readLogs({ address, fromBlock, toBlock })
      logs.push(...result)
      scannedTo ??= toBlock
      scannedFrom = fromBlock
      ranges++
      toBlock = fromBlock - 1n
    } catch (error) {
      if (window > 1n && isRangeLimit(error) && attempts < MAX_ATTEMPTS) {
        window = window / 2n
        continue
      }
      failed = true
      break
    }
  }

  // Exhausting the bounded retry budget does not establish completeness.
  if (toBlock >= 0n && ranges === 0 && attempts >= MAX_ATTEMPTS) failed = true

  return {
    rows: logs.map(decode).sort((a, b) => {
      if (a.blockNumber === null && b.blockNumber === null) return (b.logIndex ?? -1) - (a.logIndex ?? -1)
      if (a.blockNumber === null) return 1
      if (b.blockNumber === null) return -1
      if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1
      return (b.logIndex ?? -1) - (a.logIndex ?? -1)
    }),
    next: toBlock >= 0n ? { toBlock: toBlock.toString(), window: window.toString() } : null,
    failed,
    scannedFrom,
    scannedTo
  }
}

export function initialLogCursor(toBlock: bigint): LogCursor {
  return { toBlock: toBlock.toString(), window: INITIAL_WINDOW.toString() }
}
