import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScanResult } from '@/composables/eventsViaLogs'
import type { BankEventFeed } from '@/types/contract-events/bank'
import { empty, useBankEventsViaLogs } from '../useBankEventsViaLogs'

const { mockUseContractEventsViaLogs } = vi.hoisted(() => ({
  mockUseContractEventsViaLogs: vi.fn()
}))

vi.mock('@/composables/eventsViaLogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/eventsViaLogs')>()
  return { ...actual, useContractEventsViaLogs: mockUseContractEventsViaLogs }
})

const BANK = '0x1111111111111111111111111111111111111111'
const USER = '0x2222222222222222222222222222222222222222'
const FEE_COLLECTOR = '0x4444444444444444444444444444444444444444'
const USDC = '0xa3492d046095affe351cfac15de9b86425e235db'

beforeEach(() => {
  mockUseContractEventsViaLogs.mockReset()
})

describe('useBankEventsViaLogs query contract', () => {
  it('preserves the standard query while the scan result is unavailable', () => {
    const sourceQuery = {
      data: ref<ScanResult<BankEventFeed>>(),
      isPending: ref(true),
      error: ref<Error | null>(null),
      refetch: vi.fn()
    }
    mockUseContractEventsViaLogs.mockReturnValue(sourceQuery)

    const query = useBankEventsViaLogs(BANK)

    expect(query.data.value).toBeUndefined()
    expect(query.isPending).toBe(sourceQuery.isPending)
    expect(query.error).toBe(sourceQuery.error)
    expect(query.refetch).toBe(sourceQuery.refetch)
  })

  it('normalizes legacy fee tokens inside events and preserves completeness gaps', () => {
    const events = empty()
    events.bankFeePaids.items.push({
      id: '0xtx-3',
      contractAddress: BANK,
      feeCollector: FEE_COLLECTOR,
      token: null,
      amount: '3',
      timestamp: 100
    })
    events.bankTokenTransfers.items.push({
      id: '0xtx-4',
      contractAddress: BANK,
      sender: USER,
      to: USER,
      token: USDC,
      amount: '10',
      timestamp: 100
    })
    const gaps = [{ address: BANK, error: new Error('RPC scan failed') }]
    mockUseContractEventsViaLogs.mockReturnValue({
      data: ref({ events, gaps, timestampGaps: [] }),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const result = useBankEventsViaLogs(BANK).data.value

    expect(result?.events.bankFeePaids.items[0]?.token).toBe(USDC)
    expect(result?.gaps).toEqual(gaps)
    expect(result?.timestampGaps).toEqual([])
  })
})
