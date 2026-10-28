import { describe, it, expect } from 'vitest'
import { overtimeWageFormSchema, standardWageFormSchema } from '../validation'

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
