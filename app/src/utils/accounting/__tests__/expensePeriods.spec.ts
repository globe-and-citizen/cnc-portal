import { describe, it, expect } from 'vitest'
import { periodIndex, FREQUENCY } from '../mappers/expensePeriods'

const DAY = 86_400
/** 2024-01-01 00:00:00 UTC — a Monday, so weekly windows start clean. */
const MON = Math.floor(Date.UTC(2024, 0, 1) / 1000)

describe('periodIndex', () => {
  it('keeps one-time (and unknown) approvals in a single all-time bucket', () => {
    expect(
      periodIndex(
        { frequencyType: FREQUENCY.ONE_TIME, startDate: MON, customFrequency: 0 },
        MON + 400 * DAY
      )
    ).toBe(0)
    expect(
      periodIndex({ frequencyType: 99, startDate: MON, customFrequency: 0 }, MON + 10 * DAY)
    ).toBe(0)
  })

  it('clamps draws before the start date to period 0', () => {
    expect(
      periodIndex({ frequencyType: FREQUENCY.DAILY, startDate: MON, customFrequency: 0 }, MON - 5)
    ).toBe(0)
  })

  it('advances a daily approval one period per elapsed day', () => {
    const spec = { frequencyType: FREQUENCY.DAILY, startDate: MON, customFrequency: 0 }
    expect(periodIndex(spec, MON + 3600)).toBe(0) // same day
    expect(periodIndex(spec, MON + DAY + 10)).toBe(1) // next day
    expect(periodIndex(spec, MON + 9 * DAY)).toBe(9)
  })

  it('advances a weekly approval on Monday boundaries', () => {
    const spec = { frequencyType: FREQUENCY.WEEKLY, startDate: MON, customFrequency: 0 }
    expect(periodIndex(spec, MON + 6 * DAY)).toBe(0) // Sunday — still week 0
    expect(periodIndex(spec, MON + 7 * DAY)).toBe(1) // next Monday — week 1
  })

  it('advances a monthly approval on calendar months (across a year boundary)', () => {
    const spec = { frequencyType: FREQUENCY.MONTHLY, startDate: MON, customFrequency: 0 }
    const feb = Math.floor(Date.UTC(2024, 1, 15) / 1000)
    const nextJan = Math.floor(Date.UTC(2025, 0, 3) / 1000)
    expect(periodIndex(spec, feb)).toBe(1)
    expect(periodIndex(spec, nextJan)).toBe(12)
  })

  it('advances a custom approval by its period length, and no-ops on a zero length', () => {
    const spec = { frequencyType: FREQUENCY.CUSTOM, startDate: MON, customFrequency: 3 * DAY }
    expect(periodIndex(spec, MON + 3 * DAY)).toBe(1)
    expect(periodIndex(spec, MON + 7 * DAY)).toBe(2)
    expect(periodIndex({ ...spec, customFrequency: 0 }, MON + 7 * DAY)).toBe(0)
  })
})
