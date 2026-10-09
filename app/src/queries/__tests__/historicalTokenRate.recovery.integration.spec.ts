import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'

vi.unmock('@tanstack/vue-query')
const { queryClient } = await import('../queryClient')
const { useHistoricalTokenRatesQuery } = await import('../coingecko.queries')

describe('historical rate automatic recovery', () => {
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
      expect(get).toHaveBeenCalledTimes(2)
      expect(rates.rateOfRecord('native', new Date('2026-10-01T12:00:00Z'))).toBe(0.5)
      expect(rates.rateOfRecord('native', new Date('2026-10-02T12:00:00Z'))).toBe(0)
      await vi.advanceTimersByTimeAsync(59_999)
      expect(get).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(1)
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
})
