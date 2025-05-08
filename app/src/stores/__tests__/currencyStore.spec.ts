import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { LIST_CURRENCIES, useCurrencyStore } from '../currencyStore'
import { useToastStore } from '../__mocks__/useToastStore'
import { ref } from 'vue'

const priceResponse = ref<unknown>(null)
vi.mock('@/composables', () => ({
  useCustomFetch: vi.fn(() => ({
    get: () => ({
      json: () => ({
        data: priceResponse,
        execute: vi.fn(),
        isFetching: { value: false },
        error: { value: null }
      })
    })
  }))
}))

vi.mock('@/stores/useToastStore')

describe('Currency Store', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance before each test
    setActivePinia(createPinia())
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('initializes with default currency USD', () => {
    const store = useCurrencyStore()
    expect(store.localCurrency).toStrictEqual({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$'
    })
  })

  it('LIST_CURRENCIES contains expected values', () => {
    expect(LIST_CURRENCIES).toStrictEqual([
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$'
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'CA$'
      },
      {
        code: 'IDR',
        name: 'Indonesian Rupiah',
        symbol: 'Rp'
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹'
      }
    ])
  })

  it('setCurrency updates the currency value', () => {
    const store = useCurrencyStore()

    store.setCurrency('EUR')
    expect(store.localCurrency).toStrictEqual({
      code: 'EUR',
      name: 'Euro',
      symbol: '€'
    })

    store.setCurrency('CAD')
    expect(store.localCurrency).toStrictEqual({
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'CA$'
    })
  })

  it('maintains value across store instances', () => {
    const store1 = useCurrencyStore()
    store1.setCurrency('IDR')

    const store2 = useCurrencyStore()
    expect(store2.localCurrency).toStrictEqual({
      code: 'IDR',
      name: 'Indonesian Rupiah',
      symbol: 'Rp'
    })
  })

  it('should show an error if fetching price fails', async () => {
    const store = useCurrencyStore()
    await store.fetchNativeTokenPrice()

    const toastStore = useToastStore()
    expect(toastStore.addErrorToast).toHaveBeenCalledWith('Failed to fetch price')
  })

  it('should update nativeTokenPrice if fetching price succeeds', async () => {
    const store = useCurrencyStore()
    priceResponse.value = {
      market_data: {
        current_price: {
          usd: 1
        }
      }
    }
    await store.fetchNativeTokenPrice()

    expect(store.nativeToken.priceInLocal).toBe(1)
  })
})
