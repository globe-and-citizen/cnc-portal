import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import TeamContractEventList from '@/components/TeamContractEventList.vue'
import type { EventsByCampaignCode } from '@/services/AddCampaignService'

// Mocked ExtendedEvent to align with the test data
type MockedExtendedEvent = {
  eventName: string
  campaignCode: string
  budget?: string
  paymentAmount?: string
  amount?: string
  advertiser?: string
}

type MockedEventsByCampaignCode = Record<string, MockedExtendedEvent[]>

describe('TeamContractEventList.vue', () => {
  const eventsByCampaignCode: MockedEventsByCampaignCode = {
    '0xCampaign1': [
      {
        eventName: 'AdCampaignCreated',
        campaignCode: '0xCampaign1',
        budget: '1000'
      },
      {
        eventName: 'PaymentReleased',
        campaignCode: '0xCampaign1',
        paymentAmount: '500'
      }
    ],
    '0xCampaign2': [
      {
        eventName: 'AdCampaignCreated',
        campaignCode: '0xCampaign2',
        budget: '2000'
      },
      {
        eventName: 'BudgetWithdrawn',
        campaignCode: '0xCampaign2',
        amount: '300',
        advertiser: '0xAdvertiser1'
      }
    ]
  }

  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(TeamContractEventList, {
      props: { eventsByCampaignCode: eventsByCampaignCode as unknown as EventsByCampaignCode }
    })
  })

  it('renders the campaign list correctly', () => {
    // Verify the number of campaigns rendered
    const rows = wrapper.findAll('[data-test^="0-row"], [data-test^="1-row"]')
    expect(rows.length).toBe(Object.keys(eventsByCampaignCode).length)

    // Verify campaign codes and budgets
    const firstCampaignRow = rows.at(0)
    expect(firstCampaignRow?.find('.campaign-code').text()).toBe('0xCampaign1')
    expect(firstCampaignRow?.find('.campaign-budget').text()).toBe('1000 POL')

    const secondCampaignRow = rows.at(1)
    expect(secondCampaignRow?.find('.campaign-code').text()).toBe('0xCampaign2')
    expect(secondCampaignRow?.find('.campaign-budget').text()).toBe('2000 POL')
  })

  it('expands and collapses campaign details', async () => {
    // Initial state: no expanded campaigns
    expect(wrapper.findAll('ul').length).toBe(0)

    // Expand the first campaign
    const toggleButton = wrapper.find('input[type="checkbox"]')
    await toggleButton.setValue(true)

    // Verify expanded details for the first campaign
    const expandedDetails = wrapper.find('ul')
    expect(expandedDetails.exists()).toBe(true)
    const firstDetailItems = expandedDetails.findAll('li')
    expect(firstDetailItems.length).toBe(eventsByCampaignCode['0xCampaign1'].length - 1)

    // Collapse the first campaign
    await toggleButton.setValue(false)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('displays correct event details for PaymentReleased', async () => {
    // Expand the first campaign
    const toggleButton = wrapper.find('input[type="checkbox"]')
    await toggleButton.setValue(true)

    // Verify PaymentReleased details
    const detailItems = wrapper.findAll('ul li')
    expect(detailItems.at(0)?.text()).toContain('Payment Released: 500 POL')
  })

  it('displays correct event details for BudgetWithdrawn', async () => {
    // Expand the second campaign
    const toggleButtons = wrapper.findAll('input[type="checkbox"]')
    await toggleButtons.at(1)?.setValue(true)

    // Verify BudgetWithdrawn details
    const detailItems = wrapper.findAll('ul li')
    expect(detailItems.at(0)?.text()).toContain('Budget Withdrawn: 300 POL by 0xAdvertiser1')
  })

  it('handles empty events gracefully', async () => {
    // Mount the component with no events
    const emptyWrapper = mount(TeamContractEventList, {
      props: { eventsByCampaignCode: {} as EventsByCampaignCode }
    })

    // Verify no rows are rendered
    expect(emptyWrapper.find('[data-test="empty-state"]').exists()).toBe(true)
  })
})
