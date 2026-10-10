import { describe, expect, it } from 'vitest'
import {
  assetMarketFromResponse,
  coinGeckoRateTargets,
  historicalRateFromResponse,
  retryAfterDelay
} from '../coingecko'

const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('CoinGecko response interpretation', () => {
  it('deduplicates transaction dates and keeps contract identity and configured coin ids', () => {
    expect(
      coinGeckoRateTargets([
        { token: 'native', date: '2026-03-14' },
        { token: 'sher', date: '2026-03-13' },
        { token: `erc20:137:${address}`, date: '2026-03-13' },
        { token: 'native', date: '2026-03-14' }
      ])
    ).toEqual({
      assets: [{ chainId: 137, address }],
      targets: [{ token: 'native', date: '2026-03-14', coinId: 'ethereum' }],
      requests: [{ coinId: 'ethereum', date: '2026-03-14' }]
    })
  })

  it('accepts identity and a safe logo only from the matching Polygon contract', () => {
    expect(
      assetMarketFromResponse(
        {
          id: 'asset',
          platforms: { 'polygon-pos': address.toUpperCase() },
          image: { small: 'https://assets.example/token.png' }
        },
        address
      )
    ).toEqual({ coinId: 'asset', priceUsd: null, logoUri: 'https://assets.example/token.png' })
    expect(() =>
      assetMarketFromResponse({ id: 'asset', platforms: { 'polygon-pos': '0xbb' } }, address)
    ).toThrow('Asset market contract mismatch')
  })

  it('preserves historical six-decimal precision without mutating the raw response', () => {
    const body = { market_data: { current_price: { usd: 0.123456789 } } }
    expect(historicalRateFromResponse(body, 'asset', '2026-03-13')).toBe(0.123457)
    expect(body.market_data.current_price.usd).toBe(0.123456789)
  })

  it.each([undefined, 0, -1, NaN, Infinity, '1'])(
    'rejects an unavailable historical rate %s',
    (usd) => {
      expect(() =>
        historicalRateFromResponse(
          { market_data: { current_price: { usd } } },
          'asset',
          '2026-03-13'
        )
      ).toThrow('Historical USD rate unavailable')
    }
  )
  it.each([1e-10, 1e15])('rejects an unrepresentable historical rate %s', (usd) => {
    expect(() =>
      historicalRateFromResponse({ market_data: { current_price: { usd } } }, 'asset', '2026-03-13')
    ).toThrow('Historical USD rate precision unavailable')
  })

  it.each([undefined, '', '5', 'invalid', '-20'])(
    'retains the Safe Retry-After minimum for %s',
    (value) => {
      expect(retryAfterDelay(value, Date.UTC(2026, 9, 9))).toBe(60_000)
    }
  )
  it('retains the HTTP-date Retry-After interpretation used by Safe', () => {
    const now = Date.UTC(2026, 9, 9)
    expect(retryAfterDelay(new Date(now + 120_000).toUTCString(), now)).toBe(120_000)
  })
})
