import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { retryAfterDelay } from '@/utils/tokens/coingecko'
import { queryClient } from '../queryClient'
import { historicalTokenRateKeys, useHistoricalTokenRatesQuery } from '../coingecko.queries'

const targets = [
  { token: 'native' as const, date: '2026-10-01' },
  { token: 'native' as const, date: '2026-10-02' },
  { token: 'native' as const, date: '2026-10-03' }
]
interface RateSet {
  rates: Record<string, number>
  retryAfterMs?: number
}
const capture = () =>
  useQueryFn.mock.calls.at(-1)![0] as {
    queryFn: (context: { signal: AbortSignal }) => Promise<RateSet>
    queryKey: { value: readonly unknown[] }
    refetchInterval: (query: { state: { data?: RateSet } }) => number
  }
const context = () => ({ signal: new AbortController().signal })

describe('historical rate throttling recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    queryClient.clear()
  })

  it('loads one date at a time and stops at the first 429 without losing successful rates', async () => {
    let release!: (rate: number) => void
    const fetch = vi
      .spyOn(queryClient, 'fetchQuery')
      .mockReturnValueOnce(
        new Promise<number>((resolve) => {
          release = resolve
        })
      )
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '120' } } })
    useHistoricalTokenRatesQuery(targets)
    const query = capture()
    const pending = query.queryFn(context())
    expect(fetch).toHaveBeenCalledTimes(1)
    release(0.5)
    const result = await pending
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      rates: {
        'native:2026-10-01': 0.5,
        'native:2026-10-02': 0,
        'native:2026-10-03': 0
      },
      retryAfterMs: 120_000
    })
    expect(query.refetchInterval({ state: { data: result } })).toBe(120_000)
    queryClient.setQueryData(query.queryKey.value, result)
    fetch.mockResolvedValueOnce(0.75).mockResolvedValueOnce(1)
    expect(await query.queryFn(context())).toEqual({
      rates: {
        'native:2026-10-01': 0.5,
        'native:2026-10-02': 0.75,
        'native:2026-10-03': 1
      }
    })
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('keeps terminal 404 gaps on the daily cadence and continues with other dates', async () => {
    vi.spyOn(queryClient, 'fetchQuery')
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce(0.75)
      .mockResolvedValueOnce(1)
    useHistoricalTokenRatesQuery(targets)
    const query = capture()
    const result = await query.queryFn(context())
    expect(result.rates).toEqual({
      'native:2026-10-01': 0,
      'native:2026-10-02': 0.75,
      'native:2026-10-03': 1
    })
    expect(query.refetchInterval({ state: { data: result } })).toBe(86_400_000)
  })

  it('preserves later cached rates when an earlier date becomes throttled', async () => {
    useHistoricalTokenRatesQuery(targets)
    const query = capture()
    queryClient.setQueryData(query.queryKey.value, {
      rates: {
        'native:2026-10-01': 0,
        'native:2026-10-02': 0.75,
        'native:2026-10-03': 1
      }
    })
    vi.spyOn(queryClient, 'fetchQuery').mockRejectedValueOnce({ response: { status: 429 } })
    const result = await query.queryFn(context())
    expect(result.rates['native:2026-10-03']).toBe(1)
    expect(result.retryAfterMs).toBe(60_000)
    expect(historicalTokenRateKeys.all).toEqual(['historical-token-rate'])
  })

  it('cancels an obsolete batch before sending another date', async () => {
    const controller = new AbortController()
    const fetch = vi.spyOn(queryClient, 'fetchQuery').mockImplementationOnce(async () => {
      controller.abort()
      return 0.5
    })
    useHistoricalTokenRatesQuery(targets)
    await expect(capture().queryFn({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError'
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([undefined, '', '5', 'invalid', '-20'])(
    'waits at least a minute for Retry-After %s',
    (value) => {
      expect(retryAfterDelay(value, Date.UTC(2026, 9, 9))).toBe(60_000)
    }
  )
  it('respects an HTTP-date Retry-After', () => {
    const now = Date.UTC(2026, 9, 9)
    expect(retryAfterDelay(new Date(now + 120_000).toUTCString(), now)).toBe(120_000)
  })
})
