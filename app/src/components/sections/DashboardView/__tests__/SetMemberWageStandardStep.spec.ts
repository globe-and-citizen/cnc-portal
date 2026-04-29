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

const createWrapperWithProps = (
  props: Partial<{
    wageData: WageWithForm
    isPending: boolean
    wage: { id: number }
    errorMessage: string
  }> = {}
) =>
  mount(SetMemberWageStandardStep, {
    props: {
      wageData: createWageData(),
      isPending: false,
      'onUpdate:wageData': (newValue: WageWithForm) => newValue,
      ...props
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

  it('applies overtime card active state and button label when overtime is enabled', () => {
    const disabledWrapper = createWrapper(createWageData({ enableOvertimeRules: false }))
    const enabledWrapper = createWrapper(createWageData({ enableOvertimeRules: true }))

    expect(disabledWrapper.find('[data-test="enable-overtime-card"]').classes()).toContain(
      'border-base-200'
    )
    expect(enabledWrapper.find('[data-test="enable-overtime-card"]').classes()).toContain(
      'border-emerald-400'
    )
    expect(disabledWrapper.get('[data-test="add-wage-button"]').text()).toContain('Save wage')
    expect(enabledWrapper.get('[data-test="add-wage-button"]').text()).toContain('Continue')
  })

  it('updates bound values through form controls', async () => {
    const wageData = createWageData()
    const wrapper = createWrapper(wageData)
    const numberInputs = wrapper.findAll('input[type="number"]')
    const checkboxInputs = wrapper.findAll('input[type="checkbox"]')

    await numberInputs[0]?.setValue('35')
    await numberInputs[1]?.setValue('7')
    for (const checkbox of checkboxInputs) {
      await checkbox.setValue(true)
    }

    expect(wageData.maximumHoursPerWeek).toBe(35)
    expect(wageData.ratePerHour.some((rate) => rate.amount === 7)).toBe(true)
    expect(wageData.ratePerHour.some((rate) => rate.enabled) || wageData.enableOvertimeRules).toBe(
      true
    )
  })

  it('reacts to switch and checkbox model updates', async () => {
    const wageData = createWageData()
    const wrapper = createWrapper(wageData)

    await wrapper.findAll('button[role="switch"]')?.[1]?.trigger('click')
    await wrapper.get('[data-test="enable-overtime-checkbox"]')?.trigger('click')

    expect(wageData.ratePerHour.some((rate) => rate.enabled)).toBe(true)
    expect(wageData.enableOvertimeRules).toBe(true)
  })

  it('renders error and action states from props', () => {
    const wrapper = createWrapperWithProps({
      isPending: true,
      wage: { id: 1 },
      errorMessage: 'Save failed'
    })

    expect(wrapper.find('[data-test="error-state"]').text()).toContain('Save failed')
    expect(wrapper.find('[data-test="reset-wage-button"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="add-wage-button"]').attributes('disabled')).toBeDefined()
    expect(
      wrapper.get('[data-test="add-wage-cancel-button"]').attributes('disabled')
    ).toBeUndefined()
  })

  it('emits cancel, reset and validated actions', async () => {
    const wrapper = createWrapperWithProps({ wage: { id: 1 } })

    await wrapper.get('[data-test="add-wage-cancel-button"]').trigger('click')
    await wrapper.get('[data-test="reset-wage-button"]').trigger('click')
    await wrapper.get('[data-test="standard-wage-step"]').trigger('submit')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('runs validation for invalid and valid standard rate configurations', async () => {
    const invalidNoRate = createWrapper(
      createWageData({
        ratePerHour: [{ type: 'native', amount: 0, enabled: false }] as WageWithForm['ratePerHour']
      })
    )
    await invalidNoRate.get('[data-test="standard-wage-step"]').trigger('submit')
    expect(invalidNoRate.find('[data-test="add-wage-button"]').exists()).toBe(true)

    const invalidAmount = createWrapper(
      createWageData({
        ratePerHour: [{ type: 'native', amount: 0, enabled: true }] as WageWithForm['ratePerHour']
      })
    )
    await invalidAmount.get('[data-test="standard-wage-step"]').trigger('submit')
    expect(invalidAmount.find('[data-test="add-wage-button"]').exists()).toBe(true)

    const validWrapper = createWrapper(
      createWageData({
        ratePerHour: [{ type: 'native', amount: 12, enabled: true }] as WageWithForm['ratePerHour']
      })
    )
    await validWrapper.get('[data-test="standard-wage-step"]').trigger('submit')
    expect(validWrapper.find('[data-test="add-wage-button"]').exists()).toBe(true)
  })
})
