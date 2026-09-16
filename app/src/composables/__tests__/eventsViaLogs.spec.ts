import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { parseEventLogs } from 'viem'
import {
  scanContractLogs,
  START_BLOCK,
  useContractEventsViaLogs,
  type ChainClient,
  type DecodedLogLike,
  type EventMapContext,
  type ScanTarget
} from '../eventsViaLogs'
import { useQueryFn } from '@/tests/mocks/composables.mock'

/**
 * Decoding is viem's job and tested there; override the globally-mocked
 * `parseEventLogs` to pass the raw logs straight through so these tests exercise
 * only the merge / dedup / tag / timestamp orchestration of `scanContractLogs`
 * (issue #2456).
 */
beforeEach(() => {
  vi.mocked(parseEventLogs).mockImplementation(
    (({ logs }: { logs: unknown[] }) => logs) as unknown as typeof parseEventLogs
  )
})

const OLD = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const NEW = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const log = (over: Partial<DecodedLogLike>): DecodedLogLike => ({
  eventName: 'Deposited',
  args: {},
  address: OLD,
  blockNumber: 10n,
  transactionHash: '0x1',
  logIndex: 0,
  ...over
})

interface Out {
  items: { id: string; contract: string; timestamp: number; eventName: string }[]
}

const opts = {
  eventAbi: [],
  empty: (): Out => ({ items: [] }),
  mapEvent: ({ out, id, contract, timestamp, eventName }: EventMapContext<Out>) =>
    void out.items.push({ id, contract, timestamp, eventName })
}

const makeClient = (
  logsByAddress: Record<string, DecodedLogLike[]>,
  timestamps: Record<string, number> = { '10': 1010, '20': 1020, '30': 1030, '40': 1040 }
) => ({
  getLogs: vi.fn(
    async ({ address }: { address: string; fromBlock: bigint }) =>
      logsByAddress[address.toLowerCase()] ?? []
  ),
  getBlock: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
    number: blockNumber,
    timestamp: BigInt(timestamps[String(blockNumber)] ?? 1000)
  }))
})

describe('scanContractLogs', () => {
  it('merges the money-moving events of every generation into one feed', async () => {
    const client = makeClient({
      [OLD]: [log({ transactionHash: '0x1', logIndex: 0, blockNumber: 10n })],
      [NEW]: [log({ transactionHash: '0x2', logIndex: 0, blockNumber: 20n })]
    })

    const out = await scanContractLogs(
      client as unknown as ChainClient,
      [
        { address: OLD, fromBlock: 10n },
        { address: NEW, fromBlock: 20n }
      ],
      opts
    )

    expect(out.data.items.map((i) => i.id).sort()).toEqual(['0x1-0', '0x2-0'])
    expect(out.data.items.find((i) => i.id === '0x1-0')?.contract).toBe(OLD)
    expect(out.data.items.find((i) => i.id === '0x2-0')?.contract).toBe(NEW)
  })

  it('scans each generation from its own deploy boundary', async () => {
    const client = makeClient({ [OLD]: [], [NEW]: [] })

    await scanContractLogs(
      client as unknown as ChainClient,
      [
        { address: OLD, fromBlock: 10n },
        { address: NEW, fromBlock: 20n }
      ],
      opts
    )

    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ address: OLD, fromBlock: 10n })
    )
    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ address: NEW, fromBlock: 20n })
    )
  })

  it('defaults a missing deploy boundary to START_BLOCK', async () => {
    const client = makeClient({ [OLD]: [] })

    await scanContractLogs(client as unknown as ChainClient, [{ address: OLD }], opts)

    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ address: OLD, fromBlock: START_BLOCK })
    )
  })

  it('deduplicates on txHash-logIndex, so a repeated log appears once', async () => {
    const client = makeClient({
      [OLD]: [
        log({ transactionHash: '0x1', logIndex: 0, blockNumber: 10n }),
        log({ transactionHash: '0x1', logIndex: 0, blockNumber: 10n })
      ]
    })

    const out = await scanContractLogs(client as unknown as ChainClient, [{ address: OLD }], opts)

    expect(out.data.items).toHaveLength(1)
    expect(out.data.items[0].id).toBe('0x1-0')
  })

  it('keeps every event regardless of input order and resolves timestamps', async () => {
    const client = makeClient({
      [OLD]: [
        log({ transactionHash: '0x3', logIndex: 1, blockNumber: 30n }),
        log({ transactionHash: '0x1', logIndex: 0, blockNumber: 10n })
      ]
    })

    const out = await scanContractLogs(
      client as unknown as ChainClient,
      [{ address: OLD, fromBlock: 0n }],
      opts
    )

    expect(out.data.items.map((i) => i.id).sort()).toEqual(['0x1-0', '0x3-1'])
    expect(out.data.items.find((i) => i.id === '0x1-0')?.timestamp).toBe(1010)
    expect(out.data.items.find((i) => i.id === '0x3-1')?.timestamp).toBe(1030)
    expect(out.timestampGaps).toEqual([])
  })

  it('withholds an event whose block timestamp cannot be resolved', async () => {
    const client = makeClient({
      [OLD]: [log({ transactionHash: '0x1', logIndex: 0, blockNumber: 10n })]
    })

    const out = await scanContractLogs(
      client as unknown as ChainClient,
      [{ address: OLD }],
      opts,
      async () => {
        throw new Error('block unavailable')
      }
    )

    expect(out.data.items).toEqual([])
    expect(out.timestampGaps).toEqual([
      {
        transactionHash: '0x1',
        blockNumber: 10n,
        reason: 'block-unavailable'
      }
    ])
  })

  it('withholds an event that has no block number instead of assigning timestamp zero', async () => {
    const client = makeClient({
      [OLD]: [log({ transactionHash: '0x1', logIndex: 0, blockNumber: null })]
    })

    const out = await scanContractLogs(client as unknown as ChainClient, [{ address: OLD }], opts)

    expect(out.data.items).toEqual([])
    expect(out.timestampGaps).toEqual([
      {
        transactionHash: '0x1',
        blockNumber: null,
        reason: 'missing-block-number'
      }
    ])
  })

  it('preserves the loaded generations when another returns no logs', async () => {
    const client = makeClient({
      [OLD]: [log({ transactionHash: '0x1', logIndex: 0, blockNumber: 10n })],
      [NEW]: []
    })

    const out = await scanContractLogs(
      client as unknown as ChainClient,
      [{ address: OLD }, { address: NEW }],
      opts
    )

    expect(out.data.items.map((i) => i.id)).toEqual(['0x1-0'])
  })

  it('records a gap and keeps the other generations when one scan fails', async () => {
    const client = {
      getLogs: vi.fn(async ({ address }: { address: string; fromBlock: bigint }) => {
        if (address.toLowerCase() === OLD) throw new Error('RPC boom')
        return [log({ transactionHash: '0x2', logIndex: 0, blockNumber: 20n })]
      }),
      getBlock: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
        number: blockNumber,
        timestamp: 1020n
      }))
    }

    const out = await scanContractLogs(
      client as unknown as ChainClient,
      [{ address: OLD }, { address: NEW }],
      opts
    )

    expect(out.data.items.map((i) => i.id)).toEqual(['0x2-0'])
    expect(out.gaps).toHaveLength(1)
    expect(out.gaps[0].address).toBe(OLD)
  })

  it('returns the empty shape when there are no targets', async () => {
    const client = makeClient({})
    const out = await scanContractLogs(client as unknown as ChainClient, [], opts)

    expect(out.data.items).toEqual([])
    expect(client.getLogs).not.toHaveBeenCalled()
  })

  it('tags extraLogs with the scanned contract, not the emitting address', async () => {
    const client = makeClient({ [OLD]: [] })
    const withExtra = {
      ...opts,
      extraLogs: async () => [
        log({
          transactionHash: '0xfee',
          logIndex: 0,
          blockNumber: 40n,
          address: '0xfeecollector',
          eventName: 'FeePaid'
        })
      ],
      mapExtra: ({ out, id, contract, eventName }: EventMapContext<Out>) =>
        void out.items.push({ id, contract, timestamp: 0, eventName })
    }

    const out = await scanContractLogs(
      client as unknown as ChainClient,
      [{ address: OLD }],
      withExtra
    )

    const fee = out.data.items.find((i) => i.eventName === 'FeePaid')
    expect(fee?.contract).toBe(OLD)
  })
})

interface CapturedQuery {
  queryKey: MaybeRefOrGetter<readonly unknown[]>
}

const capturedQuery = (): CapturedQuery => useQueryFn.mock.calls.at(-1)?.[0] as CapturedQuery

const useTestEventFeed = (contractAddress: MaybeRefOrGetter<readonly ScanTarget[]>) =>
  useContractEventsViaLogs({
    contractAddress,
    queryKey: 'test-events-logs',
    ...opts
  })

describe('useContractEventsViaLogs query identity', () => {
  it('is stable across target order and address casing', () => {
    useTestEventFeed([
      { address: NEW, fromBlock: 20n },
      { address: OLD.toUpperCase(), fromBlock: 10n }
    ])
    const firstKey = toValue(capturedQuery().queryKey)

    useTestEventFeed([
      { address: OLD, fromBlock: 10n },
      { address: NEW.toUpperCase(), fromBlock: 20n }
    ])

    expect(toValue(capturedQuery().queryKey)).toEqual(firstKey)
    expect(firstKey).toEqual([
      'test-events-logs',
      {
        targets: [
          { address: OLD, fromBlock: '10' },
          { address: NEW, fromBlock: '20' }
        ]
      }
    ])
  })

  it('uses the earliest effective boundary when an address is repeated', () => {
    useTestEventFeed([
      { address: OLD, fromBlock: 30n },
      { address: OLD.toUpperCase(), fromBlock: 10n },
      { address: NEW }
    ])

    expect(toValue(capturedQuery().queryKey)).toEqual([
      'test-events-logs',
      {
        targets: [
          { address: OLD, fromBlock: '10' },
          { address: NEW, fromBlock: START_BLOCK.toString() }
        ]
      }
    ])
  })

  it('reacts when a deployment boundary becomes available or changes', () => {
    const targets = ref<ScanTarget[]>([{ address: OLD }])
    useTestEventFeed(targets)
    const query = capturedQuery()

    expect(toValue(query.queryKey)).toEqual([
      'test-events-logs',
      { targets: [{ address: OLD, fromBlock: START_BLOCK.toString() }] }
    ])

    targets.value = [{ address: OLD, fromBlock: 100n }]

    expect(toValue(query.queryKey)).toEqual([
      'test-events-logs',
      { targets: [{ address: OLD, fromBlock: '100' }] }
    ])

    targets.value = [{ address: OLD, fromBlock: 200n }]

    expect(toValue(query.queryKey)).toEqual([
      'test-events-logs',
      { targets: [{ address: OLD, fromBlock: '200' }] }
    ])
  })
})
