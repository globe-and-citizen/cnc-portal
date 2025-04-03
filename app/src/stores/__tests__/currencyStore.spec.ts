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
    expect(store.currency).toStrictEqual({
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
    expect(store.currency).toStrictEqual({
      code: 'EUR',
      name: 'Euro',
      symbol: '€'
    })

    store.setCurrency('CAD')
    expect(store.currency).toStrictEqual({
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'CA$'
    })
  })

  it('maintains value across store instances', () => {
    const store1 = useCurrencyStore()
    store1.setCurrency('IDR')

    const store2 = useCurrencyStore()
    expect(store2.currency).toStrictEqual({
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

    expect(store.nativeTokenPrice).toBe(1)
  })

  describe('getRate function', () => {
    it('should return 0 if price data is not available', () => {
      const store = useCurrencyStore()
      priceResponse.value = null

      expect(store.getRate('EUR')).toBe(0)
    })

    it('should return 0 if target currency is not in price data', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            usd: 1,
            eur: 0.85
          }
        }
      }

      expect(store.getRate('CAD')).toBe(0)
    })

    it('should return 0 if USD price is not available', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            eur: 0.85
          }
        }
      }

      expect(store.getRate('EUR')).toBe(0)
    })

    it('should calculate correct rate for EUR', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            usd: 1,
            eur: 0.85
          }
        }
      }

      expect(store.getRate('EUR')).toBe(0.85)
    })

    it('should calculate correct rate for CAD', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            usd: 1,
            cad: 1.35
          }
        }
      }

      expect(store.getRate('CAD')).toBe(1.35)
    })

    it('should calculate correct rate for IDR', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            usd: 1,
            idr: 15500
          }
        }
      }

      expect(store.getRate('IDR')).toBe(15500)
    })

    it('should calculate correct rate for INR', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            usd: 1,
            inr: 75.5
          }
        }
      }

      expect(store.getRate('INR')).toBe(75.5)
    })

    it('should handle case-insensitive currency codes', () => {
      const store = useCurrencyStore()
      priceResponse.value = {
        market_data: {
          current_price: {
            usd: 1,
            eur: 0.85
          }
        }
      }

      expect(store.getRate('eur')).toBe(0.85)
    })
  })
})
