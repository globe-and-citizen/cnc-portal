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
    expect(store.currency).toBe('USD')
  })

  it('LIST_CURRENCIES contains expected values', () => {
    expect(LIST_CURRENCIES).toEqual(['USD', 'EUR', 'CAD', 'XOF', 'IDR', 'INR'])
  })

  it('setCurrency updates the currency value', () => {
    const store = useCurrencyStore()

    store.setCurrency('EUR')
    expect(store.currency).toBe('EUR')

    store.setCurrency('CAD')
    expect(store.currency).toBe('CAD')
  })

  it('maintains value across store instances', () => {
    const store1 = useCurrencyStore()
    store1.setCurrency('XOF')

    const store2 = useCurrencyStore()
    expect(store2.currency).toBe('XOF')
  })
})
