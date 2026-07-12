import { describe, it, expect } from 'vitest'
import { dayKey, dayRangeSeconds, rateMapKey, makeHistoricalRateOfRecord } from '../historicalRate'
import type { UsdRateOfRecord } from '../toUsd'

describe('dayKey', () => {
  it('formats the UTC calendar day as YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-03-09T14:05:32Z'))).toBe('2026-03-09')
    // Uses UTC, not local time — an instant late in a UTC day stays that day.
    expect(dayKey(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01')
  })
})

describe('dayRangeSeconds', () => {
  it('spans the first day 00:00 UTC through the end of the last, whatever the order', () => {
    expect(dayRangeSeconds(['2026-03-11', '2026-03-09'])).toEqual({
      from: Date.parse('2026-03-09T00:00:00Z') / 1000,
      to: Date.parse('2026-03-12T00:00:00Z') / 1000
    })
  })

  it('covers the whole of a single day', () => {
    expect(dayRangeSeconds(['2026-03-09'])).toEqual({
      from: Date.parse('2026-03-09T00:00:00Z') / 1000,
      to: Date.parse('2026-03-10T00:00:00Z') / 1000
    })
  })

  it('returns null when there is no day to price', () => {
    expect(dayRangeSeconds([])).toBeNull()
  })
})

describe('rateMapKey', () => {
  it('composes the token|day key', () => {
    expect(rateMapKey('native', '2026-03-09')).toBe('native|2026-03-09')
  })
})

describe('makeHistoricalRateOfRecord', () => {
  const at = new Date('2026-03-09T10:00:00Z')

  it('returns the historical price for a resolved token/day', () => {
    const prices = new Map([[rateMapKey('native', '2026-03-09'), 0.08]])
    const resolve = makeHistoricalRateOfRecord(prices)
    expect(resolve('native', at)).toBe(0.08)
  })

  it('falls through to the fallback when the day is not (yet) priced', () => {
    const fallback: UsdRateOfRecord = () => 0.07
    const resolve = makeHistoricalRateOfRecord(new Map(), fallback)
    expect(resolve('native', at)).toBe(0.07)
  })

  it('ignores a non-positive historical price and uses the fallback', () => {
    const prices = new Map([[rateMapKey('native', '2026-03-09'), 0]])
    const resolve = makeHistoricalRateOfRecord(prices, () => 0.07)
    expect(resolve('native', at)).toBe(0.07)
  })

  it('returns 0 when neither a price nor a fallback is available', () => {
    const resolve = makeHistoricalRateOfRecord(new Map())
    expect(resolve('native', at)).toBe(0)
  })
})
