import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { fetchCampaignLogs } from '@/lib/campaign/events'
import type { Address } from 'viem'

vi.mock('@/lib/campaign/events', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return { ...actual, fetchCampaignLogs: vi.fn() }
})

import { useCampaignEventsByCode } from '../reads'

const ADDRESS = '0x1234567890123456789012345678901234567890' as Address

type CapturedConfig = {
  queryKey: unknown
  enabled: { value: boolean }
  queryFn: () => Promise<unknown>
}

describe('useCampaignEventsByCode', () => {
  let captured: CapturedConfig | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    captured = null
    useQueryFn.mockImplementation((cfg: unknown) => {
      captured = cfg as CapturedConfig
      return { data: ref(undefined), isError: ref(false), error: ref(null), refetch: vi.fn() }
    })
    mockWagmiCore.getPublicClient.mockReturnValue({})
  })

  it('disables the query when no address is provided', () => {
    useCampaignEventsByCode(undefined)
    expect(captured?.enabled.value).toBe(false)
  })

  it('enables the query when an address is provided', () => {
    useCampaignEventsByCode(ADDRESS)
    expect(captured?.enabled.value).toBe(true)
  })

  it('honors the caller-provided enabled flag', () => {
    useCampaignEventsByCode(ADDRESS, { enabled: false })
    expect(captured?.enabled.value).toBe(false)
  })

  it('namespaces the query key under campaign/events', () => {
    useCampaignEventsByCode(ADDRESS)
    const key = captured?.queryKey as unknown[]
    expect(key[0]).toBe('campaign')
    expect(key[1]).toBe('events')
  })

  it('runs the query function through fetchCampaignLogs and returns grouped events', async () => {
    vi.mocked(fetchCampaignLogs).mockResolvedValue({
      adCreated: [{ args: { campaignCode: 'X', budget: 42n } }],
      released: [{ args: { campaignCode: 'X', paymentAmount: 7n } }],
      withdrawn: [],
      releasedOnApproval: []
    })

    useCampaignEventsByCode(ADDRESS)
    const result = (await captured!.queryFn()) as Record<string, unknown[]>

    expect(fetchCampaignLogs).toHaveBeenCalledTimes(1)
    expect(result.X).toHaveLength(2)
    expect(result.X![0]).toMatchObject({ eventName: 'AdCampaignCreated', budget: 42n })
    expect(result.X![1]).toMatchObject({ eventName: 'PaymentReleased', paymentAmount: 7n })
  })
})
