import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockReadContractAction, mockWagmiCore } from '@/tests/mocks'
import { fetchCampaignLogs } from '@/lib/campaign/events'
import type { Address } from 'viem'

vi.mock('@/lib/campaign/events', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return { ...actual, fetchCampaignLogs: vi.fn() }
})

import {
  fetchAdvertisingCampaigns,
  fetchCampaignManagerSettings,
  useCampaignEventsByCode
} from '../reads'

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

describe('campaign contract reads', () => {
  beforeEach(() => {
    mockReadContractAction.mockReset()
  })

  it('loads and presents every funded campaign from the manager', async () => {
    mockReadContractAction
      .mockResolvedValueOnce(2n)
      .mockResolvedValueOnce({
        budget: 10n,
        amountSpent: 4n,
        status: 0,
        campaignCode: 'CAMPAIGN-1',
        advertiser: ADDRESS
      })
      .mockResolvedValueOnce({
        budget: 5n,
        amountSpent: 5n,
        status: 1,
        campaignCode: 'CAMPAIGN-2',
        advertiser: ADDRESS
      })

    const campaigns = await fetchAdvertisingCampaigns({} as never, ADDRESS)

    expect(campaigns).toEqual([
      expect.objectContaining({ code: 'CAMPAIGN-1', remainingBudget: 6n, status: 'active' }),
      expect.objectContaining({ code: 'CAMPAIGN-2', remainingBudget: 0n, status: 'completed' })
    ])
  })

  it('returns an empty list without making campaign detail reads', async () => {
    mockReadContractAction.mockResolvedValueOnce(0n)
    await expect(fetchAdvertisingCampaigns({} as never, ADDRESS)).resolves.toEqual([])
    expect(mockReadContractAction).toHaveBeenCalledTimes(1)
  })

  it('loads exact manager rates and the Bank destination', async () => {
    mockReadContractAction
      .mockResolvedValueOnce(100_000_000_000_000_000n)
      .mockResolvedValueOnce(10_000_000_000_000_000n)
      .mockResolvedValueOnce(ADDRESS)

    await expect(fetchCampaignManagerSettings({} as never, ADDRESS)).resolves.toEqual({
      costPerClick: '0.1',
      costPerImpression: '0.01',
      bankAddress: ADDRESS
    })
  })
})
