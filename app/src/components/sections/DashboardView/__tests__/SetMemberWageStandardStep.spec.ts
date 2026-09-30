import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SetMemberWageStandardStep from '../SetMemberWageStandardStep.vue'
import type { WageWithForm } from '../SetMemberWageModal.vue'
import { overtimeWageFormSchema, standardWageFormSchema } from '@/utils/wages/validation'

const createWageData = (overrides: Partial<WageWithForm> = {}): WageWithForm => ({
  id: 1,
  teamId: 1,
  userAddress: '0x123',
  maximumHoursPerWeek: 40,
  maximumHoursPerDay: 8,
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

describe('[US-PAYROLL-001] SetMemberWageStandardStep.vue', () => {
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

  it('[AC-US-PAYROLL-001-11] binds the daily cap and reflects it in the hint', async () => {
    const wageData = createWageData()
    const wrapper = createWrapper(wageData)

    expect(wrapper.find('[data-test="daily-cap-hint"]').text()).toContain('8 hrs/day')

    await wrapper.find('input[data-test="daily-cap-input"]').setValue('6')

    expect(wageData.maximumHoursPerDay).toBe(6)
    expect(wrapper.find('[data-test="daily-cap-hint"]').text()).toContain('6 hrs/day')
  })

  it('falls back to the default daily cap in the hint when the field is emptied', async () => {
    const wrapper = createWrapper(createWageData({ maximumHoursPerDay: 0 }))

    expect(wrapper.find('[data-test="daily-cap-hint"]').text()).toContain('8 hrs/day')
  })

  it('applies overtime card active state and button label when overtime is enabled', () => {
    const disabledWrapper = createWrapper(createWageData({ enableOvertimeRules: false }))
    const enabledWrapper = createWrapper(createWageData({ enableOvertimeRules: true }))

    expect(
      disabledWrapper.find('[data-test="enable-overtime-card"]').attributes('data-active')
    ).toBe('false')
    expect(
      enabledWrapper.find('[data-test="enable-overtime-card"]').attributes('data-active')
    ).toBe('true')
    expect(disabledWrapper.get('[data-test="add-wage-button"]').text()).toContain('Save wage')
    expect(enabledWrapper.get('[data-test="add-wage-button"]').text()).toContain('Continue')
  })

  it('updates bound values through form controls', async () => {
    const wageData = createWageData()
    const wrapper = createWrapper(wageData)
    const numberInputs = wrapper.findAll('input[type="number"]')
    const checkboxInputs = wrapper.findAll('input[type="checkbox"]')

    // 0 = weekly cap, 1 = daily cap, then one input per hourly rate
    await numberInputs[0]?.setValue('35')
    await numberInputs[2]?.setValue('7')
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

    const validWrapper = createWrapper(
      createWageData({
        ratePerHour: [{ type: 'native', amount: 12, enabled: true }] as WageWithForm['ratePerHour']
      })
    )
    await validWrapper.get('[data-test="standard-wage-step"]').trigger('submit')
    expect(validWrapper.find('[data-test="add-wage-button"]').exists()).toBe(true)
  })

  it('keeps the toggle on regardless of the amount value (0, decimal, or blank)', async () => {
    const wageData = createWageData({
      ratePerHour: [
        { type: 'native', amount: 10, enabled: true },
        { type: 'usdc', amount: 0, enabled: false },
        { type: 'sher', amount: 0, enabled: false }
      ]
    })
    const wrapper = createWrapper(wageData)
    // Index 2: the two cap inputs (weekly, daily) come first
    const firstAmountInput = wrapper.findAll('input[type="number"]')[2]

    // The amount must never flip the toggle off — otherwise the transient "0"
    // and empty "0." states while typing "0.01" would lock the input.
    await firstAmountInput?.setValue('0')
    expect(wageData.ratePerHour[0]?.enabled).toBe(true)

    await firstAmountInput?.setValue('0.01')
    expect(wageData.ratePerHour[0]?.enabled).toBe(true)
    expect(Number(wageData.ratePerHour[0]?.amount)).toBe(0.01)

    await firstAmountInput?.setValue('')
    expect(wageData.ratePerHour[0]?.enabled).toBe(true)
  })

  it('[AC-US-PAYROLL-001-07] auto-zeroes the rate amount when the toggle is turned off', async () => {
    const wageData = createWageData({
      ratePerHour: [
        { type: 'native', amount: 10, enabled: true },
        { type: 'usdc', amount: 0, enabled: false },
        { type: 'sher', amount: 0, enabled: false }
      ]
    })
    const wrapper = createWrapper(wageData)

    await wrapper.findAll('button[role="switch"]')?.[0]?.trigger('click')

    expect(wageData.ratePerHour[0]?.enabled).toBe(false)
    expect(Number(wageData.ratePerHour[0]?.amount)).toBe(0)
  })
})

describe('wage form validation', () => {
  const validStandardWage = {
    maximumHoursPerWeek: 40,
    maximumHoursPerDay: 8,
    ratePerHour: [{ type: 'native', amount: 10, enabled: true }]
  }

  const validOvertimeWage = {
    maximumOvertimeHoursPerWeek: 8,
    overtimeRatePerHour: [{ type: 'native', amount: 15, enabled: true }]
  }

  it('[AC-US-PAYROLL-001-04] validates standard and overtime rates as separate wage fields', () => {
    const standard = standardWageFormSchema.parse(validStandardWage)
    const overtime = overtimeWageFormSchema.parse(validOvertimeWage)

    expect(standard.ratePerHour[0]).toMatchObject({ type: 'native', amount: 10 })
    expect(overtime.overtimeRatePerHour[0]).toMatchObject({ type: 'native', amount: 15 })
  })

  it.each(['native', 'usdc', 'sher'] as const)(
    '[AC-US-PAYROLL-001-05] accepts a positive %s standard rate',
    (type) => {
      const result = standardWageFormSchema.safeParse({
        ...validStandardWage,
        ratePerHour: [{ type, amount: 1, enabled: true }]
      })

      expect(result.success).toBe(true)
    }
  )

  it('[AC-US-PAYROLL-001-06] requires an enabled rate with a positive amount', () => {
    for (const ratePerHour of [
      [{ type: 'native', amount: 0, enabled: true }],
      [{ type: 'native', amount: 10, enabled: false }]
    ]) {
      expect(standardWageFormSchema.safeParse({ ...validStandardWage, ratePerHour }).success).toBe(
        false
      )
    }

    expect(standardWageFormSchema.safeParse(validStandardWage).success).toBe(true)
  })

  it.each([
    ['minimum', 1, true],
    ['maximum', 40, true],
    ['zero', 0, false],
    ['fractional', 1.5, false],
    ['over maximum', 41, false]
  ] as const)(
    '[AC-US-PAYROLL-001-08] validates the %s weekly hour boundary',
    (_label, maximumHoursPerWeek, success) => {
      expect(
        standardWageFormSchema.safeParse({ ...validStandardWage, maximumHoursPerWeek }).success
      ).toBe(success)
    }
  )

  it.each([
    ['minimum', 1, true],
    ['maximum', 24, true],
    ['zero', 0, false],
    ['fractional', 1.5, false],
    ['over maximum', 25, false]
  ] as const)(
    '[AC-US-PAYROLL-001-09] validates the %s daily hour boundary',
    (_label, maximumHoursPerDay, success) => {
      expect(
        standardWageFormSchema.safeParse({ ...validStandardWage, maximumHoursPerDay }).success
      ).toBe(success)
    }
  )

  it('[AC-US-PAYROLL-001-12] requires an enabled overtime rate with a positive amount', () => {
    for (const overtimeRatePerHour of [
      [{ type: 'native', amount: 0, enabled: true }],
      [{ type: 'native', amount: 15, enabled: false }]
    ]) {
      expect(
        overtimeWageFormSchema.safeParse({ ...validOvertimeWage, overtimeRatePerHour }).success
      ).toBe(false)
    }

    expect(overtimeWageFormSchema.safeParse(validOvertimeWage).success).toBe(true)
  })

  it.each([
    ['minimum', 1, true],
    ['maximum', 20, true],
    ['zero', 0, false],
    ['fractional', 1.5, false],
    ['over maximum', 21, false]
  ] as const)(
    '[AC-US-PAYROLL-001-13] validates the %s overtime hour boundary',
    (_label, maximumOvertimeHoursPerWeek, success) => {
      expect(
        overtimeWageFormSchema.safeParse({
          ...validOvertimeWage,
          maximumOvertimeHoursPerWeek
        }).success
      ).toBe(success)
    }
  )
})
