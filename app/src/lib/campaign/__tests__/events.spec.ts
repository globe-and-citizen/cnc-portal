import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetLogs } from '@/tests/mocks/viem.actions.mock'
import {
  fetchCampaignLogs,
  groupCampaignEventsByCode,
  AD_CAMPAIGN_CREATED_EVENT,
  PAYMENT_RELEASED_EVENT,
  BUDGET_WITHDRAWN_EVENT,
  PAYMENT_RELEASED_ON_WITHDRAW_APPROVAL_EVENT,
  type CampaignEventLogs
} from '@/lib/campaign/events'
import type { Address, PublicClient } from 'viem'

const emptyLogs: CampaignEventLogs = {
  adCreated: [],
  released: [],
  withdrawn: [],
  releasedOnApproval: []
}

describe('groupCampaignEventsByCode', () => {
  it('returns an empty object when no logs are provided', () => {
    expect(groupCampaignEventsByCode(emptyLogs)).toEqual({})
  })

  it('groups a single creation event under its campaign code', () => {
    const result = groupCampaignEventsByCode({
      ...emptyLogs,
      adCreated: [{ args: { campaignCode: 'C1', budget: 1000n } }]
    })

    expect(result).toEqual({
      C1: [{ eventName: 'AdCampaignCreated', campaignCode: 'C1', budget: 1000n }]
    })
  })

  it('groups mixed event types under the same campaign code in the order: created, released, withdrawn, releasedOnApproval', () => {
    const result = groupCampaignEventsByCode({
      adCreated: [{ args: { campaignCode: 'C1', budget: 1000n } }],
      released: [{ args: { campaignCode: 'C1', paymentAmount: 200n } }],
      withdrawn: [{ args: { campaignCode: 'C1', advertiser: '0xabc', amount: 50n } }],
      releasedOnApproval: [{ args: { campaignCode: 'C1', paymentAmount: 75n } }]
    })

    expect(result.C1).toHaveLength(4)
    expect(result.C1!.map((e) => e.eventName)).toEqual([
      'AdCampaignCreated',
      'PaymentReleased',
      'BudgetWithdrawn',
      'PaymentReleasedOnWithdrawApproval'
    ])
  })

  it('groups events from multiple campaigns independently', () => {
    const result = groupCampaignEventsByCode({
      adCreated: [
        { args: { campaignCode: 'A', budget: 100n } },
        { args: { campaignCode: 'B', budget: 200n } }
      ],
      released: [{ args: { campaignCode: 'A', paymentAmount: 10n } }],
      withdrawn: [],
      releasedOnApproval: [{ args: { campaignCode: 'B', paymentAmount: 5n } }]
    })

    expect(Object.keys(result).sort()).toEqual(['A', 'B'])
    expect(result.A).toHaveLength(2)
    expect(result.B).toHaveLength(2)
  })

  it('preserves bigint values without coercion', () => {
    const huge = 2n ** 128n
    const result = groupCampaignEventsByCode({
      ...emptyLogs,
      adCreated: [{ args: { campaignCode: 'big', budget: huge } }]
    })
    const event = result.big![0]
    expect(event.eventName).toBe('AdCampaignCreated')
    if (event.eventName === 'AdCampaignCreated') {
      expect(event.budget).toBe(huge)
    }
  })
})

describe('fetchCampaignLogs', () => {
  const ADDRESS = '0x1234567890123456789012345678901234567890' as Address

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLogs.mockResolvedValue([])
  })

  it('queries the last 10k blocks when the chain head is past block 10000', async () => {
    const client = { getBlockNumber: vi.fn().mockResolvedValue(20_000n) } as unknown as PublicClient
    await fetchCampaignLogs(client, ADDRESS)

    expect(mockGetLogs).toHaveBeenCalledTimes(4)
    const firstCall = mockGetLogs.mock.calls[0][1]
    expect(firstCall.fromBlock).toBe(10_001n)
    expect(firstCall.toBlock).toBe(20_000n)
  })

  it('starts from block 0 when the chain head is within the lookback window', async () => {
    const client = { getBlockNumber: vi.fn().mockResolvedValue(500n) } as unknown as PublicClient
    await fetchCampaignLogs(client, ADDRESS)

    const firstCall = mockGetLogs.mock.calls[0][1]
    expect(firstCall.fromBlock).toBe(0n)
    expect(firstCall.toBlock).toBe(500n)
  })

  it('requests one getLogs call per AdCampaign event signature', async () => {
    const client = { getBlockNumber: vi.fn().mockResolvedValue(20_000n) } as unknown as PublicClient
    await fetchCampaignLogs(client, ADDRESS)

    const events = mockGetLogs.mock.calls.map((c) => c[1].event)
    expect(events).toEqual([
      AD_CAMPAIGN_CREATED_EVENT,
      PAYMENT_RELEASED_EVENT,
      BUDGET_WITHDRAWN_EVENT,
      PAYMENT_RELEASED_ON_WITHDRAW_APPROVAL_EVENT
    ])
    for (const call of mockGetLogs.mock.calls) {
      expect(call[1].address).toBe(ADDRESS)
    }
  })

  it('returns the logs grouped under their event bucket', async () => {
    mockGetLogs
      .mockResolvedValueOnce([{ args: { campaignCode: 'A', budget: 1n } }])
      .mockResolvedValueOnce([{ args: { campaignCode: 'A', paymentAmount: 2n } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const client = { getBlockNumber: vi.fn().mockResolvedValue(20_000n) } as unknown as PublicClient
    const result = await fetchCampaignLogs(client, ADDRESS)

    expect(result.adCreated).toHaveLength(1)
    expect(result.released).toHaveLength(1)
    expect(result.withdrawn).toHaveLength(0)
    expect(result.releasedOnApproval).toHaveLength(0)
  })
})
