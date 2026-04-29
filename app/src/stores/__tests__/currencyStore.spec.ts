import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { useQueryFn } from '@/tests/mocks'

// @tanstack/vue-query is mocked globally via composables.setup.ts
// useQueryFn is exported from composables.mock.ts and used as the useQuery implementation

let useCurrencyStore: typeof import('../currencyStore').useCurrencyStore

describe('Currency Store', () => {
  beforeEach(async () => {
    ;({ useCurrencyStore } =
      await vi.importActual<typeof import('../currencyStore')>('../currencyStore'))
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    useQueryFn.mockImplementation(() => ({
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
    useQueryFn.mockReturnValue({
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
    expect(native?.prices.find((p) => p.id === 'usd')?.price).toBe(1000)
    expect(native?.prices.find((p) => p.id === 'local')?.price).toBe(900)
    expect(usdc?.prices.find((p) => p.id === 'usd')?.price).toBe(1000)
    expect(usdc?.prices.find((p) => p.id === 'local')?.price).toBe(900)
    // Test getTokenPrice
    // expect(store.getTokenPrice('native', 'usd')).toBe(1000)
    // expect(store.getTokenPrice('usdc', 'usd')).toBe(1000)
    // Test isTokenLoading
    expect(store.isTokenLoading('native')).toBe(false)
    expect(store.isTokenLoading('usdc')).toBe(false)
  })

  it('fetchTokenPrice queryFn throws on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    let capturedQueryFn: (() => Promise<unknown>) | undefined
    useQueryFn.mockImplementation((options: { queryFn: () => Promise<unknown> }) => {
      capturedQueryFn = options.queryFn
      return {
        data: ref(undefined),
        refetch: vi.fn(),
        isFetching: ref(false)
      }
    })
    const store = useCurrencyStore()
    expect(capturedQueryFn).toBeDefined()
    await expect(capturedQueryFn!()).rejects.toThrow('Failed to fetch price')
    // getTokenInfo should return null prices
    const native = store.getTokenInfo('native')
    expect(native).toMatchSnapshot()
    expect(native?.prices.find((p) => p.id === 'usd')?.price).toBeNull()
  })
})
