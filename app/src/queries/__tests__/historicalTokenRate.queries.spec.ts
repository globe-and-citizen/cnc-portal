import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { useQueriesFn, useQueryFn } from '@/tests/mocks/composables.mock'
import {
  historicalTokenRateKeys,
  useGetHistoricalTokenRatesQuery,
  useGetTokenPriceQuery
} from '../coingecko.queries'

const capturedQueries = () => toValue(useQueriesFn.mock.calls.at(-1)![0].queries)

describe('CoinGecko endpoint queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('forwards current prices unchanged with the query cancellation signal', async () => {
    const body = { market_data: { current_price: { usd: 1, eur: 0.9 } } }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    useGetTokenPriceQuery('usd-coin')
    const query = useQueryFn.mock.calls.at(-1)![0]
    const signal = new AbortController().signal
    try {
      expect(await query.queryFn({ signal })).toBe(body)
      expect(get).toHaveBeenCalledWith('https://api.coingecko.com/api/v3/coins/usd-coin', {
        signal
      })
      expect(query.refetchInterval).toBe(300_000)
      expect(query.retry).toBe(false)
    } finally {
      get.mockRestore()
    }
  })

  it('keys raw historical snapshots by provider coin, exact UTC date and USD', async () => {
    const body = { market_data: { current_price: { usd: 0.123456789 } } }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    useGetHistoricalTokenRatesQuery([{ coinId: 'ethereum', date: '2026-03-13' }])
    const query = capturedQueries()[0]!
    const signal = new AbortController().signal
    try {
      expect(query.queryKey).toEqual(historicalTokenRateKeys.rate('ethereum', '2026-03-13'))
      expect(await query.queryFn({ signal })).toBe(body)
      expect(get).toHaveBeenCalledWith('https://api.coingecko.com/api/v3/coins/ethereum/history', {
        signal,
        params: { date: '2026-03-13', localization: false }
      })
      expect(query.staleTime).toBe(Infinity)
      expect(query.gcTime).toBe(Infinity)
      expect(query.retry).toBe(false)
    } finally {
      get.mockRestore()
    }
  })

  it('reacts to changing dates and respects the caller enabled state', () => {
    const targets = ref([{ coinId: 'ethereum', date: '2026-03-13' }])
    const enabled = ref(false)
    useGetHistoricalTokenRatesQuery(targets, enabled)
    expect(capturedQueries()[0]!.enabled).toBe(false)
    targets.value = [{ coinId: 'ethereum', date: '2026-03-14' }]
    enabled.value = true
    expect(capturedQueries()[0]!.enabled).toBe(true)
    expect(capturedQueries()[0]!.queryKey).toEqual(
      historicalTokenRateKeys.rate('ethereum', '2026-03-14')
    )
  })
})
