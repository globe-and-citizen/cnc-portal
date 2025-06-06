import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCurrencyStore } from '../currencyStore'
import { nextTick, ref } from 'vue'

// hoisted mock
const mocks = vi.hoisted(() => ({
  useQuery: vi.fn()
}))

// Mock the useQuery function to return a specific value
vi.mock('@tanstack/vue-query', () => {
  return {
    useQuery: mocks.useQuery
  }
})

// Set a default implementation for useQuery mock
mocks.useQuery.mockImplementation(() => ({
  data: ref(undefined),
  refetch: vi.fn(),
  isFetching: ref(false)
}))

describe('Currency Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    mocks.useQuery.mockImplementation(() => ({
      data: ref(undefined),
      refetch: vi.fn(),
      isFetching: ref(false)
    }))
  })

  it('initializes with default currency USD', () => {
    const store = useCurrencyStore()
    expect(store.localCurrency).toStrictEqual({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$'
    })
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
    store.setCurrency('IDR')
    expect(store.localCurrency).toStrictEqual({
      code: 'IDR',
      name: 'Indonesian Rupiah',
      symbol: 'Rp'
    })
    store.setCurrency('INVALID')
    expect(store.localCurrency).toStrictEqual({
      code: 'IDR',
      name: 'Indonesian Rupiah',
      symbol: 'Rp'
    })
  })

  it('fetches and returns token prices and info', async () => {
    const fakeResponse = {
      market_data: {
        current_price: {
          usd: 1000,
          eur: 900,
          cad: 1300,
          inr: 80000,
          idr: 15000000
        }
      }
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeResponse)
    }) as unknown as typeof fetch
    mocks.useQuery.mockReturnValue({
      data: ref(fakeResponse),
      refetch: vi.fn(),
      isFetching: ref(false)
    })
    const store = useCurrencyStore()
    store.setCurrency('EUR')
    expect(store.localCurrency).toStrictEqual({
      code: 'EUR',
      name: 'Euro',
      symbol: '€'
    })
    await nextTick()
    // Test getTokenInfo for native and usdc
    const native = store.getTokenInfo('native')
    const usdc = store.getTokenInfo('usdc')
    expect(native).toMatchSnapshot()

    expect(usdc).toMatchSnapshot()
    expect(native?.prices.find(p => p.id === 'usd')?.price).toBe(1000)
    expect(native?.prices.find(p => p.id === 'local')?.price).toBe(900)
    expect(usdc?.prices.find(p => p.id === 'usd')?.price).toBe(1000)
    expect(usdc?.prices.find(p => p.id === 'local')?.price).toBe(900)
    // Test getTokenPrice
    expect(store.getTokenPrice('native', 'usd')).toBe(1000)
    expect(store.getTokenPrice('usdc', 'usd')).toBe(1000)
    // Test isTokenLoading
    expect(store.isTokenLoading('native')).toBe(false)
    expect(store.isTokenLoading('usdc')).toBe(false)
  })

  it('fetchTokenPrice queryFn throws on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    mocks.useQuery.mockReturnValue({
      data: ref(undefined),
      refetch: vi.fn(),
      isFetching: ref(false)
    })
    const store = useCurrencyStore()
    const call = mocks.useQuery.mock.calls[0][0]
    await expect(call.queryFn()).rejects.toThrow('Failed to fetch price')
    // getTokenInfo should return null prices
    const native = store.getTokenInfo('native')
    expect(native).toMatchSnapshot()
    expect(native?.prices.find(p => p.id === 'usd')?.price).toBeNull()
  })
})
