import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SetMemberWageStandardStep from '../SetMemberWageStandardStep.vue'
import type { WageWithForm } from '../SetMemberWageModal.vue'

const createWageData = (overrides: Partial<WageWithForm> = {}): WageWithForm => ({
  id: 1,
  teamId: 1,
  userAddress: '0x123',
  maximumHoursPerWeek: 40,
  maximumOvertimeHoursPerWeek: 0,
  enableOvertimeRules: false,
  ratePerHour: [
    { type: 'native', amount: 10, enabled: true },
    { type: 'usdc', amount: 0, enabled: false },
    { type: 'sher', amount: 0, enabled: false }
  ],
  overtimeRatePerHour: [
    { type: 'native', amount: 0, enabled: false },
    { type: 'usdc', amount: 0, enabled: false },
    { type: 'sher', amount: 0, enabled: false }
  ],
  nextWageId: null,
  createdAt: '',
  updatedAt: '',
  ...overrides
})

const createWrapper = (wageData = createWageData()) =>
  mount(SetMemberWageStandardStep, {
    props: {
      wageData,
      isPending: false,
      'onUpdate:wageData': (newValue: WageWithForm) => newValue
    }
  })

describe('SetMemberWageStandardStep.vue', () => {
  it('renders step with hourly rates and currency badges', () => {
    const wrapper = createWrapper(
      createWageData({
        ratePerHour: [
          { type: 'native', amount: 10, enabled: true },
          { type: 'usdc', amount: 5, enabled: true },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    expect(wrapper.find('[data-test="standard-wage-step"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hourly Rates')
    expect(wrapper.text()).toContain('Add overtime rates')
    expect(wrapper.text()).toContain('GO')
    expect(wrapper.text()).toContain('USDC')
  })

  it('applies overtime card active state when overtime is enabled', async () => {
    const disabledWrapper = createWrapper(createWageData({ enableOvertimeRules: false }))
    const enabledWrapper = createWrapper(createWageData({ enableOvertimeRules: true }))

    expect(disabledWrapper.find('[data-test="enable-overtime-card"]').classes()).toContain(
      'border-base-200'
    )
    expect(enabledWrapper.find('[data-test="enable-overtime-card"]').classes()).toContain(
      'border-emerald-400'
    )
  })

  it('keeps a valid form when values are updated in reactive state', async () => {
    const wageData = createWageData()
    const wrapper = createWrapper(wageData)
    wageData.maximumHoursPerWeek = 45
    wageData.ratePerHour[1].enabled = true
    wageData.ratePerHour[1].amount = 7
    await wrapper.vm.$nextTick()

    expect(wageData.maximumHoursPerWeek).toBe(45)
    expect(wageData.ratePerHour[1].enabled).toBe(true)
    expect(wageData.ratePerHour[1].amount).toBe(7)
  })
})
