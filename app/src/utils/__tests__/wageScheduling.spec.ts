import { describe, expect, it } from 'vitest'
import {
  formatScheduledWageNotice,
  msUntilWageEffective,
  nextEffectiveDateLabel
} from '@/utils/wageUtil'
import type { Wage } from '@/types'
import { NETWORK } from '@/constant'

const wage = (overrides: Partial<Wage>): Wage =>
  ({
    id: 2,
    teamId: 1,
    userAddress: '0x0000000000000000000000000000000000000001',
    ratePerHour: [{ type: 'usdc', amount: 25 }],
    maximumHoursPerWeek: 40,
    disabled: false,
    nextWageId: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
    ...overrides
  }) as Wage

describe('formatScheduledWageNotice', () => {
  it('returns null when nothing is scheduled', () => {
    expect(formatScheduledWageNotice(null)).toBeNull()
    expect(formatScheduledWageNotice(undefined)).toBeNull()
    expect(formatScheduledWageNotice(wage({ effectiveFrom: null }))).toBeNull()
  })

  it('returns null when the effective date is unparseable', () => {
    expect(formatScheduledWageNotice(wage({ effectiveFrom: 'not-a-date' }))).toBeNull()
  })

  it('summarises the upcoming rate and its effective day', () => {
    const notice = formatScheduledWageNotice(wage({ effectiveFrom: '2026-08-17T00:00:00.000Z' }))

    expect(notice).toContain('USDC 25')
    expect(notice).toContain('17')
  })

  it('includes the upcoming hour ceilings alongside the rate', () => {
    // The caps can change with the rate, and showing only the rate hides half of
    // what the member is about to be held to.
    const notice = formatScheduledWageNotice(
      wage({
        effectiveFrom: '2026-08-17T00:00:00.000Z',
        maximumHoursPerWeek: 20,
        maximumHoursPerDay: 8
      })
    )

    expect(notice).toContain('20h/wk')
    expect(notice).toContain('8h/d')
  })

  it('omits the daily ceiling when the wage does not set one', () => {
    const notice = formatScheduledWageNotice(
      wage({
        effectiveFrom: '2026-08-17T00:00:00.000Z',
        maximumHoursPerWeek: 35,
        maximumHoursPerDay: undefined
      })
    )

    expect(notice).toContain('35h/wk')
    expect(notice).not.toContain('h/d')
  })

  it('joins several token rates and drops the empty ones', () => {
    const notice = formatScheduledWageNotice(
      wage({
        effectiveFrom: '2026-08-17T00:00:00.000Z',
        ratePerHour: [
          { type: 'usdc', amount: 25 },
          { type: 'sher', amount: 10 },
          { type: 'native', amount: 0 }
        ]
      })
    )

    expect(notice).toContain('USDC 25 + SHER 10')
    expect(notice).not.toContain('NATIVE')
  })

  it('shows the chain symbol for the native token, never the raw type', () => {
    // "NATIVE" is a database value; the table next to this badge renders the
    // network ticker, and the two must agree.
    const notice = formatScheduledWageNotice(
      wage({
        effectiveFrom: '2026-08-17T00:00:00.000Z',
        ratePerHour: [{ type: 'native', amount: 10 }]
      })
    )

    expect(notice).not.toContain('NATIVE')
    expect(notice).toContain(`${NETWORK.currencySymbol} 10`)
  })

  it('words the change as a replacement of the current rate', () => {
    const notice = formatScheduledWageNotice(wage({ effectiveFrom: '2026-08-17T00:00:00.000Z' }))

    expect(notice).toMatch(/^Changes to /)
  })

  it('falls back to a generic label when there is nothing to spell out', () => {
    const notice = formatScheduledWageNotice(
      wage({
        effectiveFrom: '2026-08-17T00:00:00.000Z',
        ratePerHour: [],
        maximumHoursPerWeek: 0,
        maximumHoursPerDay: undefined
      })
    )

    expect(notice).toMatch(/^Wage changes on /)
  })
})

describe('msUntilWageEffective', () => {
  const now = new Date('2026-08-12T12:00:00.000Z').getTime()

  it('returns null when nothing is scheduled', () => {
    expect(msUntilWageEffective(null, now)).toBeNull()
  })

  it('returns the remaining delay for a future change', () => {
    const delay = msUntilWageEffective(wage({ effectiveFrom: '2026-08-17T00:00:00.000Z' }), now)

    expect(delay).toBe(new Date('2026-08-17T00:00:00.000Z').getTime() - now)
  })

  it('returns null once the effective date has passed', () => {
    expect(
      msUntilWageEffective(wage({ effectiveFrom: '2026-08-10T00:00:00.000Z' }), now)
    ).toBeNull()
  })
})

describe('nextEffectiveDateLabel', () => {
  it('points at the next Monday when called mid-week', () => {
    // Wednesday 12 Aug 2026 -> Monday 17 Aug
    expect(nextEffectiveDateLabel(new Date('2026-08-12T15:00:00.000Z'))).toContain('17')
  })

  it('points at the following Monday when called on a Monday', () => {
    // A change made on Monday still lands on the *next* week's Monday, matching
    // the server so the two never disagree.
    expect(nextEffectiveDateLabel(new Date('2026-08-17T09:00:00.000Z'))).toContain('24')
  })

  it('points at the next day when called on a Sunday', () => {
    expect(nextEffectiveDateLabel(new Date('2026-08-16T09:00:00.000Z'))).toContain('17')
  })
})
