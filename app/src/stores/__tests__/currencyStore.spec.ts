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
    // Create a fresh Pinia instance before each test
    setActivePinia(createPinia())
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
    // Reset default implementation before each test
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

    // set invalid currency, but stay with the last valid one
    store.setCurrency('INVALID')
    expect(store.localCurrency).toStrictEqual({
      code: 'IDR',
      name: 'Indonesian Rupiah',
      symbol: 'Rp'
    })
  })

  // Test by mocking the useQuery function
  it('returns default currency and price data', async () => {
    // Arrange: Mock the result of useQuery
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
    // fakeJson is the response for the api call in fetchPrice & fetchUSDPrice
    const fakeJson = { market_data: { current_price: { usd: 2 } } }
    const fakeJson2 = { market_data: { current_price: { usd: 1 } } }

    // Mock the fetch function to return a resolved promise with the fake response
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeJson)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeJson2)
      }) as unknown as typeof fetch

    // Set useQuery mock: first for native token, second for usdc
    mocks.useQuery
      .mockReturnValueOnce({
        data: ref(fakeResponse),
        refetch: vi.fn(),
        isFetching: ref(false)
      })
      .mockReturnValueOnce({
        data: ref(fakeResponse),
        isFetching: ref(false)
      })

    const store = useCurrencyStore()

    // Get the first call to useQuery (for fetchPrice)
    const call = mocks.useQuery.mock.calls[0][0]
    const result = await call.queryFn()
    expect(result).toEqual(fakeJson)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.coingecko.com/api/v3/coins/')
    )

    // Get the second call to useQuery (for fetchUSDPrice)
    const call2 = mocks.useQuery.mock.calls[1][0]
    const result2 = await call2.queryFn()
    expect(result2).toEqual(fakeJson2)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.coingecko.com/api/v3/coins/usd-coin')
    )

    await nextTick()
    expect(store.localCurrency).toMatchInlineSnapshot(`
      {
        "code": "USD",
        "name": "US Dollar",
        "symbol": "$",
      }
    `)
    expect(store.nativeToken).toMatchInlineSnapshot(`
      {
        "id": "ethereum",
        "isLoading": false,
        "name": "SepoliaETH",
        "priceInLocal": 1000,
        "priceInUSD": 1000,
        "symbol": "SepoliaETH",
      }
    `)
    expect(store.usdc).toMatchInlineSnapshot(`
      {
        "id": "usd-coin",
        "isLoading": false,
        "name": "USD Coin",
        "priceInLocal": 1000,
        "priceInUSD": 1000,
        "symbol": "USDC",
      }
    `)

    // Assert
    expect(store.localCurrency.code).toBe('USD')
    expect(store.nativeToken.priceInUSD).toBe(1000)
    expect(store.usdc.priceInLocal).toBe(1000)
  })

  it('fetchPrice queryFn throws on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    const { nativeToken, usdc } = useCurrencyStore()
    const call = mocks.useQuery.mock.calls[0][0]
    await expect(call.queryFn()).rejects.toThrow('Failed to fetch price')
    // to match inline snapshot
    expect(nativeToken).toMatchInlineSnapshot(`
      {
        "id": "ethereum",
        "isLoading": false,
        "name": "SepoliaETH",
        "priceInLocal": null,
        "priceInUSD": null,
        "symbol": "SepoliaETH",
      }
    `)
    expect(usdc).toMatchInlineSnapshot(`
      {
        "id": "usd-coin",
        "isLoading": false,
        "name": "USD Coin",
        "priceInLocal": null,
        "priceInUSD": 1,
        "symbol": "USDC",
      }
    `)
  })

  it('fetchUSDPrice queryFn throws on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    useCurrencyStore()
    const call = mocks.useQuery.mock.calls[1][0]
    await expect(call.queryFn()).rejects.toThrow('Failed to fetch USD price')
  })
})
