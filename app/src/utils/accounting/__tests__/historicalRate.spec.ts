import { describe, it, expect } from 'vitest'
import {
  dayKey,
  coingeckoHistoryDate,
  rateMapKey,
  makeHistoricalRateOfRecord
} from '../historicalRate'
import type { UsdRateOfRecord } from '../toUsd'

describe('dayKey', () => {
  it('formats the UTC calendar day as YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-03-09T14:05:32Z'))).toBe('2026-03-09')
    // Uses UTC, not local time — an instant late in a UTC day stays that day.
    expect(dayKey(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01')
  })
})

describe('coingeckoHistoryDate', () => {
  it('reorders a day key to CoinGecko DD-MM-YYYY', () => {
    expect(coingeckoHistoryDate('2026-03-09')).toBe('09-03-2026')
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
