import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCryptoPrice } from '@/composables/useCryptoPrice'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

const mockPriceData = ref<unknown>(null)

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn(() => ({
    get: () => ({
      json: () => ({
        data: mockPriceData,
        execute: vi.fn(),
        isFetching: { value: false },
        error: { value: null }
      })
    })
  }))
}))

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({
      localCurrency: {
        code: 'USD',
        symbol: '$'
      }
    }))
  }
})

describe('useCryptoPrice', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch prices successfully', async () => {
    mockPriceData.value = {
      market_data: {
        current_price: {
          usd: 50000,
          eur: 45000,
          idr: 700000000
        }
      }
    }

    const TestComponent = defineComponent({
      setup() {
        const crypto = useCryptoPrice('bitcoin')
        return { crypto }
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    await flushPromises()

    const { crypto } = wrapper.vm
    expect(crypto.price.value).toBe(50000)
    expect(crypto.priceInUSD.value).toBe(50000)
    expect(crypto.isLoading.value).toBe(false)
    expect(crypto.error.value).toBeNull()

    wrapper.unmount()
  })

  it('should handle missing price data gracefully', async () => {
    mockPriceData.value = null

    const TestComponent = defineComponent({
      setup() {
        const crypto = useCryptoPrice('bitcoin')
        return { crypto }
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    await flushPromises()

    const { crypto } = wrapper.vm
    expect(crypto.price.value).toBeNull()
    expect(crypto.priceInUSD.value).toBeNull()

    wrapper.unmount()
  })

  it('should expose fetchPrice method for manual updates', async () => {
    mockPriceData.value = {
      market_data: {
        current_price: { usd: 50000 }
      }
    }

    const TestComponent = defineComponent({
      setup() {
        const crypto = useCryptoPrice('bitcoin')
        return { crypto }
      }
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    await flushPromises()

    const { crypto } = wrapper.vm
    expect(crypto.price.value).toBe(50000)

    mockPriceData.value = {
      market_data: {
        current_price: { usd: 51000 }
      }
    }
    await crypto.fetchPrice()
    expect(crypto.price.value).toBe(51000)

    wrapper.unmount()
  })
})
