import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { NETWORK } from '@/constant'
import SetMemberWageOvertimeStep from '../SetMemberWageOvertimeStep.vue'
import type { WageWithForm } from '../SetMemberWageModal.vue'

const createWageData = (overrides: Partial<WageWithForm> = {}): WageWithForm => ({
  id: 1,
  teamId: 1,
  userAddress: '0x123',
  maximumHoursPerWeek: 40,
  maximumOvertimeHoursPerWeek: 8,
  enableOvertimeRules: true,
  ratePerHour: [
    { type: 'native', amount: 10, enabled: true },
    { type: 'usdc', amount: 5, enabled: true },
    { type: 'sher', amount: 0, enabled: false }
  ],
  overtimeRatePerHour: [
    { type: 'native', amount: 15, enabled: true },
    { type: 'usdc', amount: 0, enabled: false },
    { type: 'sher', amount: 0, enabled: false }
  ],
  nextWageId: null,
  createdAt: '',
  updatedAt: '',
  ...overrides
})

const createWrapper = (wageData = createWageData()) =>
  mount(SetMemberWageOvertimeStep, {
    props: {
      wageData,
      isPending: false,
      'onUpdate:wageData': (newValue: WageWithForm) => newValue
    }
  })

describe('SetMemberWageOvertimeStep.vue', () => {
  it('renders overtime banner and recap sections', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="overtime-rules-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hours beyond')
    expect(wrapper.text()).toContain('40 hrs/wk')
    expect(wrapper.find('[data-test="standard-rate-recap"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-rate-recap"]').exists()).toBe(true)
  })

  it('renders formatted standard and overtime rate recap values', () => {
    const wrapper = createWrapper(
      createWageData({
        ratePerHour: [
          { type: 'native', amount: 10, enabled: true },
          { type: 'usdc', amount: 5, enabled: true },
          { type: 'sher', amount: 0, enabled: false }
        ],
        overtimeRatePerHour: [
          { type: 'native', amount: 20, enabled: true },
          { type: 'usdc', amount: 0, enabled: false },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    expect(wrapper.text()).toContain(`${NETWORK.currencySymbol} 10`)
    expect(wrapper.text()).toContain('USDC 5')
    expect(wrapper.text()).toContain(`${NETWORK.currencySymbol} 20`)
  })
})
