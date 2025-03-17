import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrencyRates } from '../useCurrencyRates'

describe('useCurrencyRates', () => {
  const mockRatesResponse = {
    data: {
      USD: 1,
      CAD: 1.35,
      INR: 83.25,
      EUR: 0.92
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock before each test
    global.fetch = vi.fn()
  })

  it('should initialize with default values', () => {
    const { loading, error, getRate } = useCurrencyRates()

    expect(loading.value).toBe(true)
    expect(error.value).toBeNull()
    expect(getRate('USD')).toBe(1)
  })

  it('should successfully fetch currency rates', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockRatesResponse)
    })

    const { loading, error, getRate } = useCurrencyRates()

    // Wait for the initial fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(getRate('CAD')).toBe(1.35)
    expect(getRate('INR')).toBe(83.25)
    expect(getRate('EUR')).toBe(0.92)
  })

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch exchange rates'
    global.fetch = vi.fn().mockRejectedValueOnce(new Error(errorMessage))

    const { loading, error } = useCurrencyRates()

    // Wait for the initial fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loading.value).toBe(false)
    expect(error.value).toBe(errorMessage)
  })

  it('should handle invalid API response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ data: null })
    })

    const { loading, error } = useCurrencyRates()

    // Wait for the initial fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loading.value).toBe(false)
    expect(error.value).toBe('Failed to fetch exchange rates')
  })

  it('should return default rate of 1 for unknown currencies', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockRatesResponse)
    })

    const { getRate } = useCurrencyRates()

    // Wait for the initial fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getRate('XYZ')).toBe(1)
  })

  it('should handle case-insensitive currency codes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockRatesResponse)
    })

    const { getRate } = useCurrencyRates()

    // Wait for the initial fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getRate('cad')).toBe(1.35)
    expect(getRate('CAD')).toBe(1.35)
  })

  it('should make API call with correct parameters', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockRatesResponse)
    })

    useCurrencyRates()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string

    expect(url).toContain('https://api.freecurrencyapi.com/v1/latest')
    expect(url).toContain('base_currency=USD')
    expect(url).toContain('apikey=')
  })

  it('should allow manual refresh of rates', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockRatesResponse)
    })

    const { fetchRates, loading } = useCurrencyRates()

    await new Promise((resolve) => setTimeout(resolve, 0))

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockRatesResponse)
    })

    await fetchRates()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(loading.value).toBe(false)
  })
})
