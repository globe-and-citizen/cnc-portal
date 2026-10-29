import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useSafeSwapPnl } from '../useSafeSwapPnl'
import type { SafeClientBalance, SafeIncomingTransfer } from '@/types/safe'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import * as swapValuation from '@/utils/safe/swapValuation'
import { currentChainId, USDC_ADDRESS } from '@/constant'

const { mockTransfers, mockRates, mockOrders, requests } = vi.hoisted(() => ({
  mockTransfers: {
    data: undefined as unknown as { value: SafeIncomingTransfer[] | undefined },
    isLoading: undefined as unknown as { value: boolean },
    error: undefined as unknown as { value: Error | null }
  },
  mockRates: { value: [] as { coinId: string; date: string; isLoading: boolean }[] },
  mockOrders: { value: [] as { txHash: string; isLoading: boolean }[] },
  requests: { rates: [] as unknown[], orders: [] as unknown[], markets: [] as unknown[] }
}))

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeTransfersQuery: () => mockTransfers
}))
vi.mock('@/queries/coingecko.queries', () => ({
  useGetAssetMarketsQuery: (assets: MaybeRefOrGetter<unknown[]>) => {
    requests.markets = toValue(assets)
    return { value: [] }
  },
  useGetHistoricalTokenRatesQuery: (targets: MaybeRefOrGetter<unknown[]>) => {
    requests.rates = toValue(targets)
    return mockRates
  }
}))
vi.mock('@/queries/cow.queries', () => ({
  useGetCowTransactionOrdersQuery: (txHashes: MaybeRefOrGetter<unknown[]>) => {
    requests.orders = toValue(txHashes)
    return mockOrders
  }
}))

const SAFE = '0x5AFE00000000000000000000000000000000cafe'
const SETTLEMENT = '0x9008d19f58aabd9ed0d60971565aa8510560ab41'

const leg = (overrides: Partial<SafeIncomingTransfer>): SafeIncomingTransfer => ({
  type: 'ETHER_TRANSFER',
  executionDate: '2026-06-01T10:00:00Z',
  blockNumber: 1,
  transactionHash: '0xswap',
  from: SETTLEMENT,
  to: SAFE,
  value: '1000000000000000000',
  ...overrides
})
const swapLegs = [
  leg({}),
  leg({
    type: 'ERC20_TRANSFER',
    from: SAFE,
    to: SETTLEMENT,
    value: '1000000',
    tokenAddress: '0x00000000000000000000000000000000000000c1',
    tokenInfo: {
      type: 'ERC20',
      address: '0x00000000000000000000000000000000000000c1',
      name: 'Token',
      symbol: 'TKN',
      decimals: 6
    }
  })
]

describe('[US-SAFE-007] useSafeSwapPnl', () => {
  afterEach(() => vi.restoreAllMocks())

  beforeEach(() => {
    mockTransfers.data = ref(swapLegs)
    mockTransfers.isLoading = ref(false)
    mockTransfers.error = ref(null)
    mockRates.value = []
    mockOrders.value = []
  })

  it('values the swaps found in the history and asks CoW for their fees', () => {
    const { data, isLoading } = useSafeSwapPnl(SAFE)

    expect(isLoading.value).toBe(false)
    expect(data.value?.count).toBe(1)
    expect(requests.orders).toEqual(['0xswap'])
  })

  it('requests each unknown ERC-20 market once and skips configured tokens and native transfers', () => {
    const token = swapLegs[1]!
    mockTransfers.data.value = [
      ...swapLegs,
      { ...token, tokenAddress: token.tokenAddress!.toUpperCase() },
      { ...token, tokenAddress: USDC_ADDRESS }
    ]
    useSafeSwapPnl(SAFE)
    expect(requests.markets).toEqual([
      { chainId: currentChainId, address: token.tokenAddress!.toLowerCase() }
    ])
  })

  it('waits for the daily quotes before reporting', () => {
    mockRates.value = [{ coinId: 'weth', date: '2026-06-01', isLoading: true }]
    const { data, isLoading } = useSafeSwapPnl(SAFE)

    expect(isLoading.value).toBe(true)
    expect(data.value).toBeUndefined()
  })

  it('waits for the CoW fee lookups before reporting, so no fee is dropped', () => {
    mockOrders.value = [{ txHash: '0xswap', isLoading: true }]
    const { data, isLoading } = useSafeSwapPnl(SAFE)

    expect(isLoading.value).toBe(true)
    expect(data.value).toBeUndefined()
  })

  it('keeps the last settled report while a source reloads or a refresh fails', () => {
    const { data } = useSafeSwapPnl(SAFE)
    const settled = data.value
    expect(settled?.count).toBe(1)

    mockTransfers.isLoading.value = true
    expect(data.value).toBe(settled)
    mockTransfers.isLoading.value = false
    mockTransfers.error.value = new Error('Refresh failed')
    expect(data.value?.count).toBe(1)
  })

  it('discards the previous Safe report when the address changes or is cleared during loading', () => {
    const address = ref<string | undefined>(SAFE)
    const { data } = useSafeSwapPnl(address)
    expect(data.value?.count).toBe(1)

    mockTransfers.isLoading.value = true
    const otherSafe = '0x00000000000000000000000000000000000000aa'
    address.value = otherSafe
    expect(data.value).toBeUndefined()
    address.value = undefined
    expect(data.value).toBeUndefined()
    address.value = otherSafe

    mockTransfers.data.value = swapLegs.map((row) => ({
      ...row,
      from: row.from === SAFE ? otherSafe : row.from,
      to: row.to === SAFE ? otherSafe : row.to,
      transactionHash: '0xother'
    }))
    mockTransfers.isLoading.value = false
    expect(data.value?.swaps.map(({ txHash }) => txHash)).toEqual(['0xother'])
  })

  it('UC-SWAP-014 reports nothing when the Safe history cannot be read', () => {
    mockTransfers.data.value = undefined
    mockTransfers.error.value = new Error('Safe service unavailable')
    const { data, isError } = useSafeSwapPnl(SAFE)

    expect(isError.value).toBe(true)
    expect(data.value).toBeUndefined()
  })

  it('looks nothing up without a Safe address', () => {
    const { data } = useSafeSwapPnl(undefined)

    expect(data.value).toBeUndefined()
    expect(requests.orders).toEqual([])
  })

  it('[AC-US-SAFE-007-02] filters swap transactions while retaining the original transfer objects', () => {
    const report = vi.spyOn(swapValuation, 'buildSafeSwapReport')
    const sent = Object.freeze({
      ...swapLegs[1]!,
      transferId: 'sent',
      executionDate: '2026-06-01T10:00:00.123Z'
    })
    const received = Object.freeze({ ...swapLegs[0]!, transferId: 'received' })
    const refund = Object.freeze({
      ...swapLegs[1]!,
      transferId: 'refund',
      from: SETTLEMENT,
      to: SAFE,
      value: '1000'
    })
    mockTransfers.data.value = [
      sent,
      received,
      refund,
      leg({ transactionHash: '0xdeposit' }),
      leg({ transactionHash: '0xpayment', from: SAFE, to: SETTLEMENT }),
      leg({ transactionHash: '0xself', from: SAFE }),
      leg({ transactionHash: '0xnft', type: 'ERC721_TRANSFER' })
    ]

    const { data } = useSafeSwapPnl(SAFE)
    expect(data.value?.count).toBe(1)
    const selected = report.mock.calls.at(-1)![0]
    expect(selected).toEqual([sent, received, refund])
    expect(selected[0]).toBe(sent)
    expect(selected[1]).toBe(received)
    expect(selected[2]).toBe(refund)
    expect(requests.orders).toEqual(['0xswap'])
  })

  it('keeps original Gateway rows with a usable price and reacts when the query changes', () => {
    const report = vi.spyOn(swapValuation, 'buildSafeSwapReport')
    const held: SafeClientBalance = Object.freeze({
      tokenInfo: Object.freeze({
        type: 'NATIVE_TOKEN',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        symbol: 'POL',
        name: 'Polygon',
        logoUri: 'original-logo'
      }),
      balance: '1234567890123456789',
      fiatConversion: '0.400123',
      fiatBalance: '0.494'
    })
    const balances = ref({
      fiatTotal: '0.494',
      items: [
        held,
        ...[null, '', '0', '-1', 'invalid', 'Infinity'].map((fiatConversion) => ({
          ...held,
          fiatConversion
        }))
      ]
    })
    vi.mocked(useGetSafeBalancesQuery).mockReturnValueOnce({
      data: balances,
      isLoading: ref(false),
      error: ref(null)
    } as ReturnType<typeof useGetSafeBalancesQuery>)

    const { data } = useSafeSwapPnl(SAFE)
    expect(data.value?.count).toBe(1)
    expect(data.value?.currentUsd).toBe(0.400123)
    expect(report.mock.calls.at(-1)![1].heldBalances).toEqual([held])
    expect(report.mock.calls.at(-1)![1].heldBalances[0]).toBe(held)

    balances.value = { fiatTotal: '0', items: [] }
    expect(data.value?.count).toBe(1)
    expect(report.mock.calls.at(-1)![1].heldBalances).toEqual([])
  })
})
