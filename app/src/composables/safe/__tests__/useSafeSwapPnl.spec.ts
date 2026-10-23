import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useSafeSwapPnl } from '../useSafeSwapPnl'
import type { SafeIncomingTransfer } from '@/types/safe'

const { mockTransfers, mockRates, requests } = vi.hoisted(() => ({
  mockTransfers: {
    data: undefined as unknown as { value: SafeIncomingTransfer[] | undefined },
    isLoading: undefined as unknown as { value: boolean },
    error: undefined as unknown as { value: Error | null }
  },
  mockRates: { value: [] as { coinId: string; date: string; isLoading: boolean }[] },
  requests: { rates: [] as unknown[], orders: [] as unknown[] }
}))

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeTransfersQuery: () => mockTransfers
}))
vi.mock('@/queries/coingecko.queries', () => ({
  useGetAssetMarketsQuery: () => ({ value: [] }),
  useGetHistoricalTokenRatesQuery: (targets: MaybeRefOrGetter<unknown[]>) => {
    requests.rates = toValue(targets)
    return mockRates
  }
}))
vi.mock('@/queries/cow.queries', () => ({
  useGetCowTransactionOrdersQuery: (txHashes: MaybeRefOrGetter<unknown[]>) => {
    requests.orders = toValue(txHashes)
    return { value: [] }
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
  beforeEach(() => {
    mockTransfers.data = ref(swapLegs)
    mockTransfers.isLoading = ref(false)
    mockTransfers.error = ref(null)
    mockRates.value = []
  })

  it('values the swaps found in the history and asks CoW for their fees', () => {
    const { data, isLoading } = useSafeSwapPnl(SAFE)

    expect(isLoading.value).toBe(false)
    expect(data.value?.count).toBe(1)
    expect(requests.orders).toEqual(['0xswap'])
  })

  it('waits for the daily quotes before reporting', () => {
    mockRates.value = [{ coinId: 'weth', date: '2026-06-01', isLoading: true }]
    const { data, isLoading } = useSafeSwapPnl(SAFE)

    expect(isLoading.value).toBe(true)
    expect(data.value).toBeUndefined()
  })

  it('UC-SWAP-014 reports nothing when the Safe history cannot be read', () => {
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
})
