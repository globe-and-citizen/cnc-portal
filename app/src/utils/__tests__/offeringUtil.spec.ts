import { describe, it, expect } from 'vitest'
import {
  moneyShort,
  pickerClass,
  sumWhitelistAmount,
  formatOfferingDate,
  addTerm,
  termLabel,
  maturityLabel,
  percentOf,
  expectedReturn
} from '../offeringUtil'

describe('moneyShort', () => {
  it('formats a positive amount with a dollar sign and rounds to the nearest whole number', () => {
    expect(moneyShort(1234.6)).toBe('$1,235')
  })

  it('formats zero', () => {
    expect(moneyShort(0)).toBe('$0')
  })
})

describe('pickerClass', () => {
  it('returns the active styling when active is true', () => {
    expect(pickerClass(true).join(' ')).toContain('border-[#00bf7a]')
  })

  it('returns the inactive styling when active is false', () => {
    expect(pickerClass(false).join(' ')).toContain('border-[#e0eae5]')
  })
})

describe('sumWhitelistAmount', () => {
  it('sums the amounts of all entries', () => {
    expect(sumWhitelistAmount([{ amount: 100 }, { amount: 250 }])).toBe(350)
  })

  it('treats null amounts as zero', () => {
    expect(sumWhitelistAmount([{ amount: 100 }, { amount: null }])).toBe(100)
  })

  it('returns zero for an empty list', () => {
    expect(sumWhitelistAmount([])).toBe(0)
  })
})

describe('formatOfferingDate', () => {
  it('formats an ISO date as "DD Mon YYYY"', () => {
    expect(formatOfferingDate('2026-07-01')).toBe('01 Jul 2026')
  })

  it('returns the original string for an invalid date', () => {
    expect(formatOfferingDate('not-a-date')).toBe('not-a-date')
  })
})

describe('addTerm', () => {
  const start = new Date('2026-01-15T00:00:00')

  it('adds days', () => {
    expect(addTerm(start, 10, 'days').toISOString().slice(0, 10)).toBe('2026-01-25')
  })

  it('adds months', () => {
    expect(addTerm(start, 3, 'months').toISOString().slice(0, 10)).toBe('2026-04-15')
  })

  it('adds years', () => {
    expect(addTerm(start, 2, 'years').toISOString().slice(0, 10)).toBe('2028-01-15')
  })
})

describe('termLabel', () => {
  it('pluralizes when the value is not 1', () => {
    expect(termLabel(12, 'months')).toBe('12 months')
  })

  it('keeps the noun singular when the value is 1', () => {
    expect(termLabel(1, 'years')).toBe('1 year')
  })

  it('labels a days term', () => {
    expect(termLabel(90, 'days')).toBe('90 days')
  })
})

describe('maturityLabel', () => {
  it('formats the maturity date as start date plus term', () => {
    expect(maturityLabel('2026-01-01', 6, 'months')).toBe('01 Jul 2026')
  })

  it('returns an em dash for an invalid start date', () => {
    expect(maturityLabel('invalid', 6, 'months')).toBe('—')
  })
})

describe('percentOf', () => {
  it('computes a rounded percentage', () => {
    expect(percentOf(1, 3)).toBe(33)
  })

  it('clamps to 100 when the numerator exceeds the denominator', () => {
    expect(percentOf(150, 100)).toBe(100)
  })

  it('returns zero when the denominator is zero', () => {
    expect(percentOf(50, 0)).toBe(0)
  })
})

describe('expectedReturn', () => {
  it('returns principal plus interest at the given rate', () => {
    expect(expectedReturn(1000, 10)).toBe(1100)
  })

  it('returns the principal unchanged at a zero rate', () => {
    expect(expectedReturn(1000, 0)).toBe(1000)
  })
})
