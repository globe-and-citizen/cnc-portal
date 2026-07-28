import { describe, it, expect } from 'vitest'
import { accrualSchedule, type CreditOfferTerms } from '@/utils/accounting/mappers/creditAccrual'

/** Unix seconds for a UTC instant, the unit every FixedReturn feed speaks in. */
const at = (iso: string): number => Math.floor(Date.parse(iso) / 1000)

/** 100 USDC lent at 12% flat over the term — 12 USDC of interest all told. */
const PRINCIPAL = 100_000_000n
const TOTAL_INTEREST = 12_000_000n

const terms = (over: Partial<CreditOfferTerms> = {}): CreditOfferTerms => ({
  offerId: '1',
  interestRateBps: 1200,
  maturityDate: at('2026-04-01T00:00:00Z'),
  ...over
})

const funded = at('2026-01-01T00:00:00Z')

describe('accrualSchedule', () => {
  it('books a point at each month end, closing on the cutoff', () => {
    const points = accrualSchedule(PRINCIPAL, funded, terms(), new Date('2026-02-15T12:00:00Z'))
    expect(points.map((p) => new Date(p.timestamp * 1000).toISOString())).toEqual([
      '2026-01-31T23:59:59.000Z',
      '2026-02-15T12:00:00.000Z'
    ])
  })

  it('spreads the flat fixed return straight-line across the term', () => {
    const points = accrualSchedule(PRINCIPAL, funded, terms(), new Date('2026-04-01T00:00:00Z'))
    // The first close covers 31 of the term's 90 days: 12 × 2678399/7776000 USDC.
    expect(points[0]!.accrued).toBe(4_133_331n)
    // By maturity the whole fixed return has been earned, to the base unit.
    expect(points.at(-1)!.accrued).toBe(TOTAL_INTEREST)
  })

  it('never accrues past maturity, however late the books are read', () => {
    const points = accrualSchedule(PRINCIPAL, funded, terms(), new Date('2030-01-01T00:00:00Z'))
    expect(points.at(-1)!.timestamp).toBe(terms().maturityDate)
    expect(points.at(-1)!.accrued).toBe(TOTAL_INTEREST)
  })

  it('accrues nothing without the terms, the rate, the principal or a real term', () => {
    const asOf = new Date('2026-02-15T00:00:00Z')
    expect(accrualSchedule(PRINCIPAL, funded, undefined, asOf)).toEqual([])
    expect(accrualSchedule(PRINCIPAL, funded, terms({ interestRateBps: 0 }), asOf)).toEqual([])
    expect(accrualSchedule(0n, funded, terms(), asOf)).toEqual([])
    // A maturity that does not follow the funding date leaves nothing to spread.
    expect(accrualSchedule(PRINCIPAL, funded, terms({ maturityDate: funded }), asOf)).toEqual([])
  })

  it('accrues nothing before the round has been live for any time at all', () => {
    const points = accrualSchedule(PRINCIPAL, funded, terms(), new Date(funded * 1000))
    expect(points).toEqual([])
  })

  it('handles a term shorter than a month with a single closing point', () => {
    const short = terms({ maturityDate: at('2026-01-11T00:00:00Z') })
    const points = accrualSchedule(PRINCIPAL, funded, short, new Date('2026-01-06T00:00:00Z'))
    expect(points).toHaveLength(1)
    // Half of a ten-day term has run, so half the fixed return is earned.
    expect(points[0]!.accrued).toBe(TOTAL_INTEREST / 2n)
  })
})
