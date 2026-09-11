import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import { fetchHistoricalTokenRate, historicalTokenRateKeys } from '../historicalTokenRate.queries'

const response = (usd: unknown, ok = true) => ({
  ok,
  json: async () => ({ market_data: { current_price: { usd } } })
})

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('historical token rate queries', () => {
  it('keys immutable rates by provider coin id, UTC date, and currency', () => {
    expect(historicalTokenRateKeys.rate('polygon-ecosystem-token', '2026-03-13')).toEqual([
      'historical-token-rate',
      { coinId: 'polygon-ecosystem-token', date: '2026-03-13', currency: 'usd' }
    ])
  })

  it('shares one immutable snapshot across concurrent and later callers', async () => {
    const client = queryClient()
    const request = vi.fn(async () => response(0.123456789))

    const [first, concurrent] = await Promise.all([
      fetchHistoricalTokenRate(client, 'polygon-ecosystem-token', '2026-03-13', request),
      fetchHistoricalTokenRate(client, 'polygon-ecosystem-token', '2026-03-13', request)
    ])
    const cached = await fetchHistoricalTokenRate(
      client,
      'polygon-ecosystem-token',
      '2026-03-13',
      request
    )

    expect(first).toBe(0.123457)
    expect(concurrent).toBe(first)
    expect(cached).toBe(first)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('requests the exact historical UTC date without localization data', async () => {
    const request = vi.fn(async () => response(0.5))

    await fetchHistoricalTokenRate(queryClient(), 'polygon-ecosystem-token', '2026-03-13', request)

    const url = new URL(String(request.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/api/v3/coins/polygon-ecosystem-token/history')
    expect(url.searchParams.get('date')).toBe('2026-03-13')
    expect(url.searchParams.get('localization')).toBe('false')
  })

  it('does not share rates across different dates', async () => {
    const client = queryClient()
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(0.5))
      .mockResolvedValueOnce(response(0.75))

    await expect(
      fetchHistoricalTokenRate(client, 'polygon-ecosystem-token', '2026-03-13', request)
    ).resolves.toBe(0.5)
    await expect(
      fetchHistoricalTokenRate(client, 'polygon-ecosystem-token', '2026-03-14', request)
    ).resolves.toBe(0.75)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('rejects an absent or invalid USD rate instead of inventing a valuation', async () => {
    await expect(
      fetchHistoricalTokenRate(queryClient(), 'polygon-ecosystem-token', '2026-03-13', async () =>
        response(undefined)
      )
    ).rejects.toThrow('Historical USD rate unavailable')
  })

  it('retries a previously unavailable date on the next explicit fetch', async () => {
    const client = queryClient()
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(undefined, false))
      .mockResolvedValueOnce(response(0.8))

    await expect(
      fetchHistoricalTokenRate(client, 'polygon-ecosystem-token', '2026-03-13', request)
    ).rejects.toThrow('Historical USD rate unavailable')
    await expect(
      fetchHistoricalTokenRate(client, 'polygon-ecosystem-token', '2026-03-13', request)
    ).resolves.toBe(0.8)
    expect(request).toHaveBeenCalledTimes(2)
  })
})
