import { describe, it, expect } from 'vitest'
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatToken,
  formatTokenUnits,
  formatUsd
} from '@/utils/format/number'
import { EMPTY_VALUE } from '@/utils/format/shared'

describe('formatNumber', () => {
  it('adds thousands separators and trims trailing zeros', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5')
    expect(formatNumber(1_000_000)).toBe('1,000,000')
  })

  it('keeps fractional amounts instead of rounding them to zero', () => {
    expect(formatNumber(0.2)).toBe('0.2')
    expect(formatNumber(0.0001)).toBe('0.0001')
  })

  it('parses decimal strings coming out of formatUnits', () => {
    expect(formatNumber('1234.5')).toBe('1,234.5')
  })

  it('pads to minDecimals and rounds past maxDecimals', () => {
    expect(formatNumber(5, { minDecimals: 2 })).toBe('5.00')
    expect(formatNumber(1.23456, { maxDecimals: 2 })).toBe('1.23')
  })

  it('renders the empty placeholder for values it cannot display', () => {
    expect(formatNumber(null)).toBe(EMPTY_VALUE)
    expect(formatNumber(undefined)).toBe(EMPTY_VALUE)
    expect(formatNumber(NaN)).toBe(EMPTY_VALUE)
    expect(formatNumber(Infinity)).toBe(EMPTY_VALUE)
    expect(formatNumber('not a number')).toBe(EMPTY_VALUE)
  })
})

describe('formatUsd', () => {
  it('renders fixed cents', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50')
    expect(formatUsd(5)).toBe('$5.00')
  })

  it('puts the sign before the symbol', () => {
    expect(formatUsd(-12.3)).toBe('-$12.30')
  })

  it('collapses a sub-cent residue onto a clean zero', () => {
    expect(formatUsd(-0.004)).toBe('$0.00')
    expect(formatUsd(-0)).toBe('$0.00')
  })

  it('supports a finer precision for unit prices', () => {
    expect(formatUsd(0.123456, { decimals: 6 })).toBe('$0.123456')
  })

  it('renders the empty placeholder for values it cannot display', () => {
    expect(formatUsd(NaN)).toBe(EMPTY_VALUE)
    expect(formatUsd(null)).toBe(EMPTY_VALUE)
  })
})

describe('formatToken', () => {
  it('suffixes the symbol and keeps variable precision', () => {
    expect(formatToken(1234.5, 'USDC')).toBe('1,234.5 USDC')
    expect(formatToken(0, 'SHER')).toBe('0 SHER')
  })

  it('does not append a symbol to a value it cannot display', () => {
    expect(formatToken(null, 'USDC')).toBe(EMPTY_VALUE)
  })
})

describe('formatTokenUnits', () => {
  it('formats an on-chain integer amount with its symbol', () => {
    expect(formatTokenUnits(1_250_000_000_000_000_000n, 18, 'POL')).toBe('1.25 POL')
  })

  it('keeps missing amounts distinct from zero', () => {
    expect(formatTokenUnits(null, 18, 'POL')).toBe('—')
    expect(formatTokenUnits(0n, 18, 'POL')).toBe('0 POL')
  })
})

describe('formatCurrency', () => {
  it('defaults to USD, matching formatUsd', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
    expect(formatCurrency(1234.5)).toBe(formatUsd(1234.5))
  })

  it('honours the requested currency', () => {
    expect(formatCurrency(1234.5, { currency: 'EUR' })).toBe('€1,234.50')
  })

  it('honours the decimals option', () => {
    expect(formatCurrency(1234.5, { decimals: 0 })).toBe('$1,235')
  })

  it('collapses a signed zero rather than alarming with -$0.00', () => {
    expect(formatCurrency(-0.001)).toBe('$0.00')
  })

  it('renders the empty value for a non-number', () => {
    expect(formatCurrency(null)).toBe(EMPTY_VALUE)
    expect(formatCurrency(undefined)).toBe(EMPTY_VALUE)
  })
})

describe('formatCompact', () => {
  it('shortens large magnitudes', () => {
    expect(formatCompact(1_500)).toBe('$1.5K')
    expect(formatCompact(1_234_567)).toBe('$1.23M')
    expect(formatCompact(-2_000_000_000)).toBe('-$2B')
  })

  it('honours the requested currency', () => {
    expect(formatCompact(1_000, { currency: 'EUR' })).toBe('€1K')
  })
})

describe('formatPercent', () => {
  it('takes a ratio, not percentage points', () => {
    expect(formatPercent(0.125)).toBe('12.50%')
    expect(formatPercent(1)).toBe('100.00%')
  })

  it('honours the decimals option', () => {
    expect(formatPercent(0.125, { decimals: 1 })).toBe('12.5%')
    expect(formatPercent(0.125, { decimals: 0 })).toBe('13%')
  })

  it('marks the direction of a delta when asked', () => {
    expect(formatPercent(0.05, { decimals: 1, signed: true })).toBe('+5.0%')
    expect(formatPercent(-0.05, { decimals: 1, signed: true })).toBe('-5.0%')
    expect(formatPercent(0, { decimals: 1, signed: true })).toBe('0.0%')
  })

  it('renders the empty placeholder for values it cannot display', () => {
    expect(formatPercent(NaN)).toBe(EMPTY_VALUE)
  })
})
