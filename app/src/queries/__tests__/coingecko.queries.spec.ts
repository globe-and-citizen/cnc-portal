import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { BACKEND_URL } from '@/constant'
import { useQueriesFn, useQueryFn } from '@/tests/mocks/composables.mock'
import {
  useGetAssetMarketsQuery,
  useGetHistoricalTokenRatesQuery,
  useGetTokenPriceQuery
} from '../coingecko.queries'

const apiUrl = `${BACKEND_URL}/api/coingecko`
const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const capturedQuery = () => useQueryFn.mock.calls.at(-1)![0]
const capturedQueries = () => toValue(useQueriesFn.mock.calls.at(-1)![0].queries)

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('useGetTokenPriceQuery', () => {
  it.each([
    ['usd-coin', 'usd-coin'],
    ['coin/id with space', 'coin%2Fid%20with%20space']
  ])('requests current prices for %s and returns the raw response', async (coinId, encodedId) => {
    const body = { market_data: { current_price: { usd: 1, eur: 0.9 } } }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    const signal = new AbortController().signal

    useGetTokenPriceQuery(coinId)

    await expect(capturedQuery().queryFn({ signal })).resolves.toBe(body)
    expect(get).toHaveBeenCalledExactlyOnceWith(`${apiUrl}/coins/${encodedId}`, { signal })
  })

  it('propagates the provider error', async () => {
    const error = new Error('CoinGecko unavailable')
    vi.spyOn(externalApiClient, 'get').mockRejectedValueOnce(error)

    useGetTokenPriceQuery('usd-coin')

    await expect(capturedQuery().queryFn({ signal: new AbortController().signal })).rejects.toBe(
      error
    )
  })
})

describe('useGetAssetMarketsQuery', () => {
  it('requests the lowercase Polygon contract and returns its raw metadata', async () => {
    const body = {
      id: 'asset',
      platforms: { 'polygon-pos': address },
      market_data: { current_price: { usd: 0.123456789 } }
    }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    const signal = new AbortController().signal

    useGetAssetMarketsQuery([{ chainId: 137, address: address.toUpperCase() }])

    await expect(capturedQueries()[0]!.queryFn({ signal })).resolves.toBe(body)
    expect(get).toHaveBeenCalledExactlyOnceWith(`${apiUrl}/coins/polygon-pos/contract/${address}`, {
      signal
    })
  })

  it.each([
    { id: 'asset', platforms: { 'polygon-pos': '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } },
    { id: 'asset', platforms: { ethereum: address } },
    { platforms: { 'polygon-pos': address } }
  ])('rejects metadata that does not identify the requested Polygon contract: %j', async (body) => {
    vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    useGetAssetMarketsQuery([{ chainId: 137, address }])

    await expect(
      capturedQueries()[0]!.queryFn({ signal: new AbortController().signal })
    ).rejects.toThrow('Asset market contract mismatch')
  })

  it('propagates the provider error', async () => {
    const error = new Error('Contract market unavailable')
    vi.spyOn(externalApiClient, 'get').mockRejectedValueOnce(error)
    useGetAssetMarketsQuery([{ chainId: 137, address }])

    await expect(
      capturedQueries()[0]!.queryFn({ signal: new AbortController().signal })
    ).rejects.toBe(error)
  })

  it.each([
    { chainId: 137, address, enabled: true, expected: true },
    { chainId: 137, address, enabled: false, expected: false },
    { chainId: 137, address: '', enabled: true, expected: false },
    { chainId: 1, address, enabled: true, expected: false },
    { chainId: 31337, address, enabled: true, expected: false }
  ])('sets request eligibility for %j', ({ chainId, address, enabled, expected }) => {
    useGetAssetMarketsQuery([{ chainId, address }], enabled)

    expect(capturedQueries()[0]!.enabled).toBe(expected)
  })

  it('creates no requests for an empty asset list', () => {
    useGetAssetMarketsQuery([])

    expect(capturedQueries()).toEqual([])
  })

  it('associates each result with its asset identity', () => {
    const assets = [
      { chainId: 137, address },
      { chainId: 137, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
    ]
    const results = [{ data: { id: 'first' } }, { error: new Error('Market unavailable') }]
    useGetAssetMarketsQuery(() => assets)

    const combine = useQueriesFn.mock.calls.at(-1)![0].combine

    expect(combine(results)).toEqual([
      { ...results[0], ...assets[0] },
      { ...results[1], ...assets[1] }
    ])
  })
})

describe('useGetHistoricalTokenRatesQuery', () => {
  it('requests the exact date and returns the unrounded historical response', async () => {
    const body = { market_data: { current_price: { usd: 0.123456789 } } }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    const signal = new AbortController().signal
    useGetHistoricalTokenRatesQuery([{ coinId: 'coin/id', date: '2026-03-13' }])

    await expect(capturedQueries()[0]!.queryFn({ signal })).resolves.toBe(body)
    expect(get).toHaveBeenCalledExactlyOnceWith(`${apiUrl}/coins/coin%2Fid/history`, {
      signal,
      params: { date: '2026-03-13', localization: false }
    })
  })

  it('rejects a historical response without a usable USD price', async () => {
    vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: {} })
    useGetHistoricalTokenRatesQuery([{ coinId: 'ethereum', date: '2026-03-13' }])

    await expect(
      capturedQueries()[0]!.queryFn({ signal: new AbortController().signal })
    ).rejects.toThrow('Historical USD rate unavailable for ethereum on 2026-03-13')
  })

  it('propagates the provider error', async () => {
    const error = new Error('Historical prices unavailable')
    vi.spyOn(externalApiClient, 'get').mockRejectedValueOnce(error)
    useGetHistoricalTokenRatesQuery([{ coinId: 'ethereum', date: '2026-03-13' }])

    await expect(
      capturedQueries()[0]!.queryFn({ signal: new AbortController().signal })
    ).rejects.toBe(error)
  })

  it.each([
    { coinId: 'ethereum', date: '2026-03-13', enabled: true, expected: true },
    { coinId: 'ethereum', date: '2026-03-13', enabled: false, expected: false },
    { coinId: '', date: '2026-03-13', enabled: true, expected: false },
    { coinId: 'ethereum', date: '', enabled: true, expected: false }
  ])('sets request eligibility for %j', ({ coinId, date, enabled, expected }) => {
    useGetHistoricalTokenRatesQuery([{ coinId, date }], enabled)

    expect(capturedQueries()[0]!.enabled).toBe(expected)
  })

  it('creates no requests for an empty target list', () => {
    useGetHistoricalTokenRatesQuery([])

    expect(capturedQueries()).toEqual([])
  })

  it('associates each result with its coin and date', () => {
    const targets = [
      { coinId: 'ethereum', date: '2026-03-13' },
      { coinId: 'usd-coin', date: '2026-03-14' }
    ]
    const results = [{ data: { market_data: { current_price: { usd: 2000 } } } }, { data: {} }]
    useGetHistoricalTokenRatesQuery(() => targets)

    const combine = useQueriesFn.mock.calls.at(-1)![0].combine

    expect(combine(results)).toEqual([
      { ...results[0], ...targets[0] },
      { ...results[1], ...targets[1] }
    ])
  })
})
