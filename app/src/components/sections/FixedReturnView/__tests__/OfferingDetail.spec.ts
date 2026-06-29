import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OfferingDetail from '../OfferingDetail.vue'
import { mockFixedReturnReads } from '@/tests/mocks'
import type { OfferingSummary } from '@/types'

const TOKEN = '0x1111111111111111111111111111111111111111' as const

function baseOffering(overrides: Partial<OfferingSummary> = {}): OfferingSummary {
  return {
    id: '1',
    title: 'Riverside Note',
    rate: 8,
    term: 12,
    termUnit: 'months',
    startDate: '2030-01-01',
    access: 'general',
    raised: 100000,
    target: 100000,
    totalRepaid: 0,
    status: 'funded',
    token: TOKEN,
    ...overrides
  }
}

function mountDetail(offering: OfferingSummary = baseOffering()) {
  return mount(OfferingDetail, { props: { offering } })
}

describe('OfferingDetail.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.offerLenders.data.value = []
    mockFixedReturnReads.offerLenders.isLoading.value = false
  })

  it('emits back when the back button is clicked', async () => {
    const wrapper = mountDetail()
    await wrapper.find('[data-test="offering-detail-back-button"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('shows a loading row while lenders are loading', () => {
    mockFixedReturnReads.offerLenders.isLoading.value = true
    const wrapper = mountDetail()
    expect(wrapper.find('[data-test="lenders-loading"]').exists()).toBe(true)
  })

  it('shows an empty state when there are no lenders', () => {
    const wrapper = mountDetail()
    expect(wrapper.find('[data-test="lenders-empty"]').exists()).toBe(true)
  })

  it('renders a row per lender with formatted amounts', () => {
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x2222222222222222222222222222222222222222', principal: 50000, expected: 54000 }
    ]
    const wrapper = mountDetail(baseOffering({ totalRepaid: 0 }))

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('50,000 Token')
  })

  it('marks a lender on-track (not overdue) when nothing has been repaid yet but maturity has not passed', () => {
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x2222222222222222222222222222222222222222', principal: 50000, expected: 54000 }
    ]
    // repayLenders has no on-chain maturity check, so an unpaid loan that hasn't
    // reached its due date yet is just on-track - not late.
    const wrapper = mountDetail(
      baseOffering({ totalRepaid: 0, raised: 100000, startDate: '2030-01-01' })
    )

    const row = wrapper.find('tbody tr')
    expect(row.text()).toContain('On track')
    expect(row.text()).not.toContain('Overdue')
  })

  it('marks a lender overdue once maturity has passed with nothing repaid', () => {
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x2222222222222222222222222222222222222222', principal: 50000, expected: 54000 }
    ]
    const wrapper = mountDetail(
      baseOffering({
        totalRepaid: 0,
        raised: 100000,
        startDate: '2020-01-01',
        term: 1,
        termUnit: 'months'
      })
    )

    expect(wrapper.text()).toContain('Overdue')
  })

  it('filters lenders by a search query matching the address', async () => {
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', principal: 1000, expected: 1080 },
      { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', principal: 2000, expected: 2160 }
    ]
    const wrapper = mountDetail()

    await wrapper.find('[data-test="lender-search-input"]').setValue('0xaaaa')

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('1,000 Token')
  })

  it('shows a no-match state when the search query matches no lender', async () => {
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', principal: 1000, expected: 1080 }
    ]
    const wrapper = mountDetail()

    await wrapper.find('[data-test="lender-search-input"]').setValue('nonexistent')

    expect(wrapper.find('[data-test="lenders-no-match"]').exists()).toBe(true)
  })
})
