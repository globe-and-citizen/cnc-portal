import { describe, expect, it } from 'vitest'
import { groupCampaignEventsByCode, type CampaignEventLogs } from '@/lib/campaign/events'

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
