import { describe, it, expect, vi } from 'vitest'
import type { ChainClient, DecodedLogLike, EventMapContext } from '@/composables/eventsViaLogs'
import type { BankEventFeed } from '@/types/contract-events/bank'
import {
  bankExtraLogs,
  empty,
  mapBankExtra,
  rawTokenTransferLogs,
  supportedTokenAddresses
} from '../useBankEventsViaLogs'

const BANK = '0x1111111111111111111111111111111111111111'
const USDC = '0xa3492d046095affe351cfac15de9b86425e235db'
const USDT = '0xc5fa85b5c5f9c3a17f5a24b2b55b4516c3a4fa5b'
const USER = '0x2222222222222222222222222222222222222222'

/**
 * A viem-like client whose `getLogs` is keyed on the `event` name and the
 * indexed filter, so a test can hand back the exact TokenSupportAdded /
 * incoming / outgoing Transfer sets each call expects.
 */
const makeClient = (over: {
  supported?: DecodedLogLike[]
  incoming?: (token: string) => DecodedLogLike[]
  outgoing?: (token: string) => DecodedLogLike[]
  fees?: DecodedLogLike[]
}) => ({
  getLogs: vi.fn(
    async ({
      address,
      event,
      args
    }: {
      address: string
      event?: { name?: string }
      args?: { to?: string; from?: string }
    }) => {
      if (event?.name === 'TokenSupportAdded') return over.supported ?? []
      if (event?.name === 'FeePaid') return over.fees ?? []
      if (event?.name === 'Transfer') {
        if (args?.to) return over.incoming?.(address.toLowerCase()) ?? []
        if (args?.from) return over.outgoing?.(address.toLowerCase()) ?? []
      }
      return []
    }
  )
})

const transferLog = (over: Partial<DecodedLogLike>): DecodedLogLike => ({
  eventName: 'Transfer',
  args: {},
  address: USDC,
  blockNumber: 10n,
  transactionHash: '0xtx',
  logIndex: 0,
  ...over
})

describe('supportedTokenAddresses', () => {
  it('collects the deduplicated, lower-cased token set from TokenSupportAdded logs', async () => {
    const client = makeClient({
      supported: [
        transferLog({ eventName: 'TokenSupportAdded', args: { tokenAddress: USDC } }),
        transferLog({ eventName: 'TokenSupportAdded', args: { tokenAddress: USDC } }),
        transferLog({ eventName: 'TokenSupportAdded', args: { tokenAddress: USDT } })
      ]
    })

    const tokens = await supportedTokenAddresses(client as unknown as ChainClient, BANK)

    expect(tokens).toEqual([USDC.toLowerCase(), USDT.toLowerCase()])
  })
})

describe('rawTokenTransferLogs', () => {
  it('fetches incoming and outgoing Transfers for every supported token', async () => {
    const client = makeClient({
      supported: [transferLog({ eventName: 'TokenSupportAdded', args: { tokenAddress: USDC } })],
      incoming: (token) => [transferLog({ address: token, transactionHash: '0xin', logIndex: 0 })],
      outgoing: (token) => [transferLog({ address: token, transactionHash: '0xout', logIndex: 1 })]
    })

    const logs = await rawTokenTransferLogs(client as unknown as ChainClient, BANK)

    expect(logs.map((l) => l.transactionHash).sort()).toEqual(['0xin', '0xout'])
  })

  it('returns nothing when the Bank supports no tokens', async () => {
    const client = makeClient({ supported: [] })
    expect(await rawTokenTransferLogs(client as unknown as ChainClient, BANK)).toEqual([])
  })
})

describe('bankExtraLogs', () => {
  it('merges the FeeCollector fees with the raw token transfers', async () => {
    const client = makeClient({
      supported: [transferLog({ eventName: 'TokenSupportAdded', args: { tokenAddress: USDC } })],
      incoming: (token) => [transferLog({ address: token, transactionHash: '0xin', logIndex: 0 })],
      fees: [transferLog({ eventName: 'FeePaid', transactionHash: '0xfee', logIndex: 2 })]
    })

    const logs = await bankExtraLogs(client as unknown as ChainClient, BANK)

    expect(logs.map((l) => l.eventName).sort()).toEqual(['FeePaid', 'Transfer'])
  })
})

describe('mapBankExtra', () => {
  const fold = (log: DecodedLogLike): BankEventFeed => {
    const out = empty()
    mapBankExtra({
      out,
      id: `${log.transactionHash}-${log.logIndex}`,
      timestamp: 100,
      contract: BANK,
      eventName: log.eventName ?? '',
      args: log.args,
      log
    } as EventMapContext<BankEventFeed>)
    return out
  }

  it('maps a Transfer into the Bank as an incoming raw transfer', () => {
    const out = fold(transferLog({ args: { from: USER, to: BANK, value: 5n } }))
    expect(out.rawContractTokenTransfers.items[0]).toMatchObject({
      direction: 'in',
      tokenAddress: USDC,
      amount: '5'
    })
  })

  it('maps a Transfer out of the Bank as an outgoing raw transfer', () => {
    const out = fold(transferLog({ args: { from: BANK, to: USER, value: 7n } }))
    expect(out.rawContractTokenTransfers.items[0]).toMatchObject({ direction: 'out', amount: '7' })
  })

  it('maps a Bank-to-Bank Transfer as internal', () => {
    const out = fold(transferLog({ args: { from: BANK, to: BANK, value: 1n } }))
    expect(out.rawContractTokenTransfers.items[0]?.direction).toBe('internal')
  })

  it('maps a non-Transfer entry as a FeePaid', () => {
    const out = fold(
      transferLog({
        eventName: 'FeePaid',
        address: '0xfeecollector',
        args: { token: USDC, amount: 3n }
      })
    )
    expect(out.bankFeePaids.items[0]).toMatchObject({ feeCollector: '0xfeecollector', amount: '3' })
    expect(out.rawContractTokenTransfers.items).toHaveLength(0)
  })
})
