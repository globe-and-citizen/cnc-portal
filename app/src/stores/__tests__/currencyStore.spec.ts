import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { LIST_CURRENCIES, useCurrencyStore } from '../currencyStore'

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
        code: 'XOF',
        name: 'West African CFA franc',
        symbol: 'CFA'
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
    store1.setCurrency('XOF')

    const store2 = useCurrencyStore()
    expect(store2.currency).toStrictEqual({
      code: 'XOF',
      name: 'West African CFA franc',
      symbol: 'CFA'
    })
  })
})
