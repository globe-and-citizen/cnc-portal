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

const createWrapperWithProps = (
  props: Partial<{ wageData: WageWithForm; isPending: boolean; errorMessage: string }> = {}
) =>
  mount(SetMemberWageOvertimeStep, {
    props: {
      wageData: createWageData(),
      isPending: false,
      'onUpdate:wageData': (newValue: WageWithForm) => newValue,
      ...props
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

  it('updates overtime values through form controls', async () => {
    const wageData = createWageData()
    const wrapper = createWrapper(wageData)
    const numberInputs = wrapper.findAll('input[type="number"]')
    const checkboxInputs = wrapper.findAll('input[type="checkbox"]')

    await numberInputs[0]?.setValue('10')
    await numberInputs[1]?.setValue('9')
    for (const checkbox of checkboxInputs) {
      await checkbox.setValue(true)
    }

    expect(wageData.maximumOvertimeHoursPerWeek).toBe(10)
    expect(wageData.overtimeRatePerHour.some((rate) => rate.amount === 9)).toBe(true)
    expect(wageData.overtimeRatePerHour.some((rate) => rate.enabled)).toBe(true)
  })

  it('reacts to switch model updates', async () => {
    const wageData = createWageData({
      overtimeRatePerHour: [
        { type: 'native', amount: 15, enabled: false },
        { type: 'usdc', amount: 0, enabled: false },
        { type: 'sher', amount: 0, enabled: false }
      ]
    })
    const wrapper = createWrapper(wageData)

    await wrapper.findAll('button[role="switch"]')?.[0]?.trigger('click')

    expect(wageData.overtimeRatePerHour.some((rate) => rate.enabled)).toBe(true)
  })

  it('renders error state and pending submit state from props', () => {
    const wrapper = createWrapperWithProps({
      isPending: true,
      errorMessage: 'Overtime save failed'
    })

    expect(wrapper.find('[data-test="error-state"]').text()).toContain('Overtime save failed')
    expect(
      wrapper.get('[data-test="save-overtime-wage-button"]').attributes('disabled')
    ).toBeDefined()
  })

  it('emits back and validated actions', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-test="back-wage-button"]').trigger('click')
    await wrapper.get('[data-test="overtime-rules-step"]').trigger('submit')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('runs validation for invalid and valid overtime configurations', async () => {
    const invalidNoRate = createWrapper(
      createWageData({
        overtimeRatePerHour: [
          { type: 'native', amount: 0, enabled: false }
        ] as WageWithForm['overtimeRatePerHour']
      })
    )
    await invalidNoRate.get('[data-test="overtime-rules-step"]').trigger('submit')
    expect(invalidNoRate.find('[data-test="save-overtime-wage-button"]').exists()).toBe(true)

    const invalidAmount = createWrapper(
      createWageData({
        overtimeRatePerHour: [
          { type: 'native', amount: 0, enabled: true }
        ] as WageWithForm['overtimeRatePerHour']
      })
    )
    await invalidAmount.get('[data-test="overtime-rules-step"]').trigger('submit')
    expect(invalidAmount.find('[data-test="save-overtime-wage-button"]').exists()).toBe(true)

    const validWrapper = createWrapper(
      createWageData({
        overtimeRatePerHour: [
          { type: 'native', amount: 18, enabled: true }
        ] as WageWithForm['overtimeRatePerHour']
      })
    )
    await validWrapper.get('[data-test="overtime-rules-step"]').trigger('submit')
    expect(validWrapper.find('[data-test="save-overtime-wage-button"]').exists()).toBe(true)
  })
})
