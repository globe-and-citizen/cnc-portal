import { QueryClient } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { queryClient as sharedQueryClient } from '../queryClient'
import {
  fetchHistoricalTokenRate,
  historicalTokenRateKeys,
  useHistoricalTokenRatesQuery
} from '../historicalTokenRate.queries'

const response = (usd: unknown, ok = true) => ({
  ok,
  json: async () => ({ market_data: { current_price: { usd } } })
})

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

interface CapturedHistoricalRateQuery {
  queryKey: MaybeRefOrGetter<readonly unknown[]>
  enabled: MaybeRefOrGetter<boolean>
  queryFn: () => Promise<Record<string, number>>
}

const capturedQuery = (): CapturedHistoricalRateQuery =>
  useQueryFn.mock.calls.at(-1)?.[0] as CapturedHistoricalRateQuery

describe('historical token rate queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('normalizes target sets and exposes reactive query state', async () => {
    const data = ref<Record<string, number>>()
    const isLoading = ref(false)
    const isFetching = ref(false)
    const refetch = vi.fn().mockResolvedValue({ data: { 'native:2026-03-13': 0.5 } })
    useQueryFn.mockReturnValue({ data, isLoading, isFetching, refetch })
    const enabled = ref(false)
    const targets = ref([
      { token: 'native' as const, date: '2026-03-14' },
      { token: 'sher' as const, date: '2026-03-13' },
      { token: 'native' as const, date: '2026-03-13' },
      { token: 'native' as const, date: '2026-03-14' }
    ])

    const rates = useHistoricalTokenRatesQuery(targets, enabled)
    const query = capturedQuery()

    expect(toValue(query.queryKey)).toEqual([
      'historical-token-rate',
      'set',
      [
        { token: 'native', coinId: 'ethereum', date: '2026-03-13' },
        { token: 'native', coinId: 'ethereum', date: '2026-03-14' }
      ]
    ])
    expect(toValue(query.enabled)).toBe(false)
    enabled.value = true
    expect(toValue(query.enabled)).toBe(true)
    expect(rates.rateOfRecord('native', new Date('2026-03-13T23:59:59Z'))).toBe(0)

    data.value = { 'native:2026-03-13': 0.5 }
    expect(rates.rateOfRecord('native', new Date('2026-03-13T23:59:59Z'))).toBe(0.5)
    expect(rates.isLoading.value).toBe(false)
    isLoading.value = true
    expect(rates.isLoading.value).toBe(true)
    isLoading.value = false
    isFetching.value = true
    expect(rates.isLoading.value).toBe(true)
    await expect(rates.refetch()).resolves.toEqual({ data: { 'native:2026-03-13': 0.5 } })
  })

  it('keeps unavailable targets explicit while retaining successful snapshots', async () => {
    useQueryFn.mockReturnValue({
      data: ref<Record<string, number>>(),
      isLoading: ref(false),
      isFetching: ref(false)
    })
    const fetchQuery = vi
      .spyOn(sharedQueryClient, 'fetchQuery')
      .mockResolvedValueOnce(0.5)
      .mockRejectedValueOnce(new Error('rate unavailable'))

    const rates = useHistoricalTokenRatesQuery([
      { token: 'native', date: '2026-03-13' },
      { token: 'native', date: '2026-03-14' }
    ])

    await expect(capturedQuery().queryFn()).resolves.toEqual({
      'native:2026-03-13': 0.5,
      'native:2026-03-14': 0
    })
    await expect(rates.refetch()).resolves.toBeUndefined()
    expect(fetchQuery).toHaveBeenCalledTimes(2)
    fetchQuery.mockRestore()
  })
})
