import { beforeEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import type { VestingCreation } from '@/types/vesting'

describe('VestingSummary.vue', () => {
  let wrapper: VueWrapper
  const vesting: VestingCreation = {
    member: {
      name: 'Test User',
      address: '0x120000000000000000000000000000000000dead'
    },
    totalAmount: '1000.5',
    tokenSymbol: 'SHR',
    startAt: new Date(2026, 7, 21, 9, 37),
    endAt: new Date(2030, 7, 21, 9, 37),
    cliffEndAt: new Date(2027, 7, 21, 9, 37),
    durationMinutes: 2_103_840,
    cliffMinutes: 525_600,
    noCliff: false
  }

  const mountComponent = (props = {}) =>
    mount(VestingSummary, {
      props: { vesting, loading: false, ...props }
    })

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('summarizes the beneficiary, token grant and calendar durations', () => {
    expect(wrapper.find('[data-test="summary-member"]').text()).toContain('Test User')
    expect(wrapper.find('[data-test="summary-amount"]').text()).toContain('1,000.5 SHR')
    expect(wrapper.find('[data-test="summary-duration"]').text()).toContain('4 years')
    expect(wrapper.find('[data-test="summary-cliff"]').text()).toContain('1 year')
  })

  it('shows every minute-precise boundary in the review timeline', () => {
    expect(wrapper.find('[data-test="preview-start"]').text()).toContain('09:37')
    expect(wrapper.find('[data-test="preview-cliff"]').text()).toContain('09:37')
    expect(wrapper.find('[data-test="preview-end"]').text()).toContain('09:37')
  })

  it('emits navigation actions and disables them while creating', async () => {
    await wrapper.find('[data-test="back-btn"]').trigger('click')
    await wrapper.find('[data-test="confirm-btn"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    wrapper = mountComponent({ loading: true })
    expect(wrapper.find('[data-test="back-btn"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="confirm-btn"]').text()).toContain('Creating schedule')
  })
})
