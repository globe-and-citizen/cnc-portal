import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCryptoPrice } from '../useCryptoPrice'
import { flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

describe('useCryptoPrice', () => {
  const mockPriceData = {
    bitcoin: {
      usd: 50000,
      usd_24h_change: 2.5
    },
    ethereum: {
      usd: 3000,
      usd_24h_change: 1.8
    }
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    vi.clearAllTimers()
    // Mock the global fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch prices successfully', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPriceData)
    })

    const TestComponent = defineComponent({
      setup() {
        const crypto = useCryptoPrice(['bitcoin', 'ethereum'])
        return { crypto }
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()

    const { crypto } = wrapper.vm
    expect(crypto.loading.value).toBe(true)

    await flushPromises()

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
    )
    expect(crypto.prices.value).toEqual(mockPriceData)
    expect(crypto.loading.value).toBe(false)
    expect(crypto.error.value).toBeNull()

    wrapper.unmount()
  })

  it('should update prices periodically', async () => {
    vi.useFakeTimers()

    const firstResponse = { bitcoin: { usd: 50000, usd_24h_change: 2.5 } }
    const secondResponse = { bitcoin: { usd: 51000, usd_24h_change: 3.0 } }

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(firstResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondResponse)
      })

    const TestComponent = defineComponent({
      setup() {
        const crypto = useCryptoPrice(['bitcoin'])
        return { crypto }
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    await flushPromises()

    const { crypto } = wrapper.vm
    expect(crypto.prices.value).toEqual(firstResponse)

    // Fast forward 1 minute
    vi.advanceTimersByTime(60000)
    await flushPromises()

    expect(crypto.prices.value).toEqual(secondResponse)
    expect(global.fetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
    wrapper.unmount()
  })

  it('should cleanup interval on unmount', async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const TestComponent = defineComponent({
      setup() {
        useCryptoPrice(['bitcoin'])
        return {}
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    wrapper.unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('should expose fetchPrices method for manual updates', async () => {
    const firstResponse = { bitcoin: { usd: 50000 } }
    const secondResponse = { bitcoin: { usd: 51000 } }

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(firstResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondResponse)
      })

    const TestComponent = defineComponent({
      setup() {
        const crypto = useCryptoPrice(['bitcoin'])
        return { crypto }
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    await flushPromises()

    const { crypto } = wrapper.vm
    expect(crypto.prices.value).toEqual(firstResponse)

    // Manually fetch prices
    await crypto.fetchPrices()
    expect(crypto.prices.value).toEqual(secondResponse)

    wrapper.unmount()
  })
})
