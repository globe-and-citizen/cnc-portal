import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'

vi.unmock('@tanstack/vue-query')
const { queryClient } = await import('../queryClient')
const {
  useHistoricalTokenRatesQuery,
  getCoinGeckoTokenPrice,
  getCoinGeckoAssetMarket,
  getCoinGeckoHistoricalRate
} = await import('../coingecko.queries')

describe('historical rate automatic recovery', () => {
  it('keeps the provider pause when new source dates arrive after a 429', async () => {
    vi.useFakeTimers()
    queryClient.clear()
    const targets = ref([
      { token: 'native' as const, date: '2026-10-01' },
      { token: 'native' as const, date: '2026-10-02' }
    ])
    let throttle = true
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async () => {
      if (throttle) throw { response: { status: 429, headers: { 'retry-after': '120' } } }
      return { data: { market_data: { current_price: { usd: 0.75 } } } }
    })
    let rates!: ReturnType<typeof useHistoricalTokenRatesQuery>
    const wrapper = mount(
      defineComponent({
        setup() {
          rates = useHistoricalTokenRatesQuery(targets)
          return () => h('div')
        }
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
    )
    try {
      await vi.advanceTimersByTimeAsync(0)
      expect(get).toHaveBeenCalledTimes(1)
      targets.value.push({ token: 'native', date: '2026-10-03' })
      await nextTick()
      await vi.advanceTimersByTimeAsync(0)
      expect(get).toHaveBeenCalledTimes(1)
      await rates.refetch()
      expect(get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(119_999)
      expect(get).toHaveBeenCalledTimes(1)
      throttle = false
      await vi.advanceTimersByTimeAsync(12_001)
      expect(get).toHaveBeenCalledTimes(4)
      expect(rates.rateOfRecord('native', new Date('2026-10-03T12:00:00Z'))).toBe(0.75)
    } finally {
      wrapper.unmount()
      queryClient.clear()
      get.mockRestore()
      vi.useRealTimers()
    }
  })

  it('waits a minute after 429, recovers pending dates and reuses successful snapshots', async () => {
    vi.useFakeTimers()
    queryClient.clear()
    let throttle = true
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (url) => {
      const date = new URL(String(url)).searchParams.get('date')
      if (date === '2026-10-02' && throttle) {
        throttle = false
        throw { response: { status: 429, headers: { 'retry-after': '60' } } }
      }
      return {
        data: { market_data: { current_price: { usd: date === '2026-10-01' ? 0.5 : 0.75 } } }
      }
    })
    let rates!: ReturnType<typeof useHistoricalTokenRatesQuery>
    const Host = defineComponent({
      setup() {
        rates = useHistoricalTokenRatesQuery([
          { token: 'native', date: '2026-10-01' },
          { token: 'native', date: '2026-10-02' },
          { token: 'native', date: '2026-10-03' }
        ])
        return () => h('div')
      }
    })
    const wrapper = mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    try {
      await vi.advanceTimersByTimeAsync(0)
      expect(get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(6000)
      expect(get).toHaveBeenCalledTimes(2)
      expect(rates.rateOfRecord('native', new Date('2026-10-01T12:00:00Z'))).toBe(0.5)
      expect(rates.rateOfRecord('native', new Date('2026-10-02T12:00:00Z'))).toBe(0)
      await vi.advanceTimersByTimeAsync(59_999)
      expect(get).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(1)
      expect(get).toHaveBeenCalledTimes(3)
      await vi.advanceTimersByTimeAsync(6000)
      expect(get).toHaveBeenCalledTimes(4)
      expect(rates.rateOfRecord('native', new Date('2026-10-02T12:00:00Z'))).toBe(0.75)
      expect(rates.rateOfRecord('native', new Date('2026-10-03T12:00:00Z'))).toBe(0.75)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(get).toHaveBeenCalledTimes(4)
    } finally {
      wrapper.unmount()
      queryClient.clear()
      get.mockRestore()
      vi.useRealTimers()
    }
  })

  it('spaces current prices, contract discovery and history on the same provider window', async () => {
    vi.useFakeTimers()
    queryClient.clear()
    const started: number[] = []
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async () => {
      started.push(Date.now())
      return { data: { market_data: { current_price: { usd: 0.75 } } } }
    })
    try {
      const pending = Promise.all([
        getCoinGeckoTokenPrice('polygon-ecosystem-token'),
        getCoinGeckoAssetMarket('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
        getCoinGeckoHistoricalRate('polygon-ecosystem-token', '2026-10-01')
      ])
      await vi.advanceTimersByTimeAsync(0)
      expect(get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(5999)
      expect(get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(6001)
      await pending
      expect(started.map((at) => at - started[0]!)).toEqual([0, 6000, 12000])
    } finally {
      queryClient.clear()
      get.mockRestore()
      vi.useRealTimers()
    }
  })

  it('honors a long Retry-After across current prices and contract discovery without more HTTP calls', async () => {
    vi.useFakeTimers()
    queryClient.clear()
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '600' } } })
      .mockResolvedValue({ data: { id: 'asset' } })
    try {
      await expect(getCoinGeckoTokenPrice('polygon-ecosystem-token')).rejects.toMatchObject({
        response: { status: 429 }
      })
      await expect(
        getCoinGeckoAssetMarket('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      ).rejects.toMatchObject({ retryAfterMs: 600_000 })
      await vi.advanceTimersByTimeAsync(599_999)
      await expect(getCoinGeckoHistoricalRate('asset', '2026-10-01')).rejects.toMatchObject({
        retryAfterMs: 1
      })
      expect(get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      await expect(getCoinGeckoTokenPrice('asset')).resolves.toEqual({ id: 'asset' })
      expect(get).toHaveBeenCalledTimes(2)
    } finally {
      queryClient.clear()
      get.mockRestore()
      vi.useRealTimers()
    }
  })

  it('waits for a slow 429 response before admitting other consumers', async () => {
    vi.useFakeTimers()
    queryClient.clear()
    let rejectRequest!: (error: unknown) => void
    const get = vi.spyOn(externalApiClient, 'get').mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject
        })
    )
    try {
      const pending = Promise.allSettled([
        getCoinGeckoTokenPrice('first'),
        getCoinGeckoTokenPrice('second'),
        getCoinGeckoHistoricalRate('asset', '2026-10-01')
      ])
      await vi.advanceTimersByTimeAsync(12_000)
      expect(get).toHaveBeenCalledTimes(1)
      rejectRequest({ response: { status: 429 } })
      const results = await pending
      expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected', 'rejected'])
      expect(get).toHaveBeenCalledTimes(1)
    } finally {
      queryClient.clear()
      get.mockRestore()
      vi.useRealTimers()
    }
  })

  it('cancels a waiting request without sending it or reserving the next provider slot', async () => {
    vi.useFakeTimers()
    queryClient.clear()
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: {} })
    try {
      await getCoinGeckoTokenPrice('first')
      const controller = new AbortController()
      const cancelled = expect(
        getCoinGeckoTokenPrice('obsolete', controller.signal)
      ).rejects.toMatchObject({ name: 'AbortError' })
      controller.abort()
      await cancelled
      const pending = getCoinGeckoTokenPrice('next')
      await vi.advanceTimersByTimeAsync(6000)
      await pending
      expect(get.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
        '/api/v3/coins/first',
        '/api/v3/coins/next'
      ])
    } finally {
      queryClient.clear()
      get.mockRestore()
      vi.useRealTimers()
    }
  })
})
