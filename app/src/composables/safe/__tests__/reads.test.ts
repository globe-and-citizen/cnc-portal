import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Address } from 'viem'
import { formatCurrencyShort } from '@/utils/currencyUtil'

// Hoisted mocks so they survive module resets
const { mockTeamStore, mockUseCurrencyStore } = vi.hoisted(() => ({
  mockTeamStore: {
    currentTeamMeta: {
      isPending: false,
      data: { safeAddress: '0x1111111111111111111111111111111111111111' as Address }
    }
  },
  mockUseCurrencyStore: {
    getTokenInfo: vi.fn(() => ({
      id: 'native',
      name: 'Native',
      symbol: 'NATIVE',
      code: 'NATIVE',
      prices: [
        { id: 'usd', price: 2, code: 'USD', symbol: '$' },
        { id: 'eur', price: 1.5, code: 'EUR', symbol: '€' }
      ]
    }))
  }
}))

// Mock external dependencies to align with composable imports
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: vi.fn(() => mockUseCurrencyStore)
}))

const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as Address
const INVALID_ADDRESS = 'invalid-safe-address' as Address
const MOCK_PRICES = [
  { id: 'usd', price: 2, code: 'USD', symbol: '$' },
  { id: 'eur', price: 1.5, code: 'EUR', symbol: '€' }
]

const axiosGetMock = vi.fn()
let useSafeReads: typeof import('../reads').useSafeReads
let useSafeAppUrls: typeof import('../reads').useSafeAppUrls

vi.mock('axios', () => {
  const isAxiosError = (error: unknown) =>
    Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
  return {
    default: { isAxiosError },
    isAxiosError
  }
})

vi.mock('@/lib/axios', () => {
  const isAxiosError = (error: unknown) =>
    Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
  return {
    default: {
      get: axiosGetMock,
      isAxiosError,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
  }
})

vi.mock('@tanstack/vue-query', () => {
  const useQuery = (options: { queryFn: () => Promise<unknown> }) => {
    const data = ref<unknown>(undefined)
    const error = ref<Error | null>(null)
    const isLoading = ref(false)
    const isFetching = ref(false)

    const runQuery = async () => {
      isLoading.value = true
      isFetching.value = true
      try {
        const result = await options.queryFn()
        data.value = result
        error.value = null
        return { data: result, error: null }
      } catch (err) {
        error.value = err as Error
        return { data: data.value, error: err }
      } finally {
        isLoading.value = false
        isFetching.value = false
      }
    }

    return {
      data,
      error,
      isLoading,
      isFetching,
      refetch: vi.fn(runQuery)
    }
  }

  return { useQuery }
})

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  axiosGetMock.mockReset()

  mockTeamStore.currentTeamMeta = {
    isPending: false,
    data: { safeAddress: SAFE_ADDRESS }
  }
  mockUseCurrencyStore.getTokenInfo.mockReturnValue({
    id: 'native',
    name: 'Native',
    symbol: 'NATIVE',
    code: 'NATIVE',
    prices: MOCK_PRICES
  })

  const module = await import('../reads')
  useSafeReads = module.useSafeReads
  useSafeAppUrls = module.useSafeAppUrls
})

describe('useSafeAppUrls', () => {
  it('builds Safe app URLs using chain mapping with fallback', () => {
    const { getSafeHomeUrl, getSafeSettingsUrl } = useSafeAppUrls()

    expect(getSafeHomeUrl(137, SAFE_ADDRESS)).toBe(
      `https://app.safe.global/home?safe=polygon:${SAFE_ADDRESS}`
    )
    expect(getSafeSettingsUrl(137, SAFE_ADDRESS)).toBe(
      `https://app.safe.global/settings/setup?safe=polygon:${SAFE_ADDRESS}`
    )
    expect(getSafeHomeUrl(999, SAFE_ADDRESS)).toBe(
      `https://app.safe.global/home?safe=ethereum:${SAFE_ADDRESS}`
    )
  })

  it('opens Safe app URLs in a new tab with security flags', () => {
    const { openSafeAppUrl } = useSafeAppUrls()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const targetUrl = 'https://app.safe.global'

    openSafeAppUrl(targetUrl)

    expect(openSpy).toHaveBeenCalledWith(targetUrl, '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
  })
})

describe('useSafeReads', () => {
  it('exposes Safe address from the team store and validates it', () => {
    const { safeAddress, isSafeAddressValid } = useSafeReads()

    expect(safeAddress.value).toBe(SAFE_ADDRESS)
    expect(isSafeAddressValid.value).toBe(true)

    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { safeAddress: INVALID_ADDRESS }
    }
    const { isSafeAddressValid: invalidAddressValid } = useSafeReads()
    expect(invalidAddressValid.value).toBe(false)
  })

  it('fetches Safe info, balances, and formats totals', async () => {
    const { useSafeInfo } = useSafeReads()
    const balancesUrl = `https://safe-transaction-polygon.safe.global/api/v1/safes/${SAFE_ADDRESS}/balances/`
    const detailsUrl = `https://safe-transaction-polygon.safe.global/api/v1/safes/${SAFE_ADDRESS}/`

    axiosGetMock
      .mockResolvedValueOnce({
        data: [
          {
            tokenAddress: null,
            balance: '2000000000000000000',
            token: { decimals: 18, symbol: 'POL' }
          }
        ]
      })
      .mockResolvedValueOnce({ data: { owners: [SAFE_ADDRESS], threshold: 1 } })

    const { safeInfo, error, isLoading, fetchSafeInfo } = useSafeInfo(ref(137))
    await fetchSafeInfo()

    expect(axiosGetMock).toHaveBeenCalledWith(balancesUrl)
    expect(axiosGetMock).toHaveBeenCalledWith(detailsUrl)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(safeInfo.value).toMatchObject({
      address: SAFE_ADDRESS,
      chain: 'polygon',
      balance: '2',
      symbol: 'POL',
      owners: [SAFE_ADDRESS],
      threshold: 1
    })

    const totals = safeInfo.value?.totals
    expect(totals?.USD.value).toBe(4)
    expect(totals?.USD.formated).toBe(formatCurrencyShort(4, 'USD'))
    expect(totals?.USD.formatedPrice).toBe(formatCurrencyShort(2, 'USD'))
    expect(totals?.EUR.value).toBe(3)
    expect(totals?.EUR.formated).toBe(formatCurrencyShort(3, 'EUR'))
  })

  it('returns an error when the chain is unsupported', async () => {
    const { useSafeInfo } = useSafeReads()
    const { error, safeInfo, isLoading, fetchSafeInfo } = useSafeInfo(ref(999))

    await fetchSafeInfo()

    expect(error.value).toBe('Unsupported chainId: 999')
    expect(safeInfo.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(axiosGetMock).not.toHaveBeenCalled()
  })

  it('handles invalid Safe addresses without calling the API', async () => {
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { safeAddress: INVALID_ADDRESS }
    }

    const { useSafeInfo } = useSafeReads()
    const { error, safeInfo, isLoading, fetchSafeInfo } = useSafeInfo(ref(137))

    await fetchSafeInfo()

    expect(error.value).toBe('Invalid Safe address')
    expect(safeInfo.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(axiosGetMock).not.toHaveBeenCalled()
  })

  it('fetches Safe owners', async () => {
    const { useSafeOwners } = useSafeReads()
    axiosGetMock.mockResolvedValueOnce({
      data: {
        owners: [SAFE_ADDRESS, '0x2222222222222222222222222222222222222222'],
        threshold: 2
      }
    })

    const { owners, error, isLoading, fetchOwners } = useSafeOwners(ref(137))
    await fetchOwners()

    expect(axiosGetMock).toHaveBeenCalledTimes(1)
    expect(axiosGetMock).toHaveBeenCalledWith(
      `https://safe-transaction-polygon.safe.global/api/v1/safes/${SAFE_ADDRESS}/`
    )
    expect(owners.value).toEqual([SAFE_ADDRESS, '0x2222222222222222222222222222222222222222'])
    expect(error.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })

  it('returns an error when fetching owners for an unsupported chain', async () => {
    const { useSafeOwners } = useSafeReads()
    const { owners, error, isLoading, fetchOwners } = useSafeOwners(ref(999))

    await fetchOwners()

    expect(error.value).toBe('Unsupported chainId: 999')
    expect(owners.value).toEqual([])
    expect(isLoading.value).toBe(false)
    expect(axiosGetMock).not.toHaveBeenCalled()
  })

  it('fetches Safe threshold', async () => {
    const { useSafeThreshold } = useSafeReads()
    axiosGetMock.mockResolvedValueOnce({ data: { owners: [], threshold: 3 } })

    const { threshold, error, isLoading, fetchThreshold } = useSafeThreshold(ref(137))
    await fetchThreshold()

    expect(axiosGetMock).toHaveBeenCalledTimes(1)
    expect(axiosGetMock).toHaveBeenCalledWith(
      `https://safe-transaction-polygon.safe.global/api/v1/safes/${SAFE_ADDRESS}/`
    )
    expect(threshold.value).toBe(3)
    expect(error.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })

  it('returns an error when fetching threshold for an unsupported chain', async () => {
    const { useSafeThreshold } = useSafeReads()
    const { threshold, error, isLoading, fetchThreshold } = useSafeThreshold(ref(999))

    await fetchThreshold()

    expect(error.value).toBe('Unsupported chainId: 999')
    expect(threshold.value).toBe(1)
    expect(isLoading.value).toBe(false)
    expect(axiosGetMock).not.toHaveBeenCalled()
  })

  it('propagates axios error messages for Safe info', async () => {
    const { useSafeInfo } = useSafeReads()
    axiosGetMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'API Balance Error' } },
      message: 'Balance failed'
    })

    const { error, fetchSafeInfo } = useSafeInfo(ref(137))
    await fetchSafeInfo()

    expect(error.value).toBe('API Balance Error')
  })

  it('propagates axios error messages for Safe details', async () => {
    const { useSafeInfo } = useSafeReads()
    axiosGetMock
      .mockResolvedValueOnce({
        data: [
          {
            tokenAddress: null,
            balance: '0',
            token: { decimals: 18, symbol: 'POL' }
          }
        ]
      })
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { message: 'Details Error' } },
        message: 'Details failed'
      })

    const { error, fetchSafeInfo } = useSafeInfo(ref(137))
    await fetchSafeInfo()

    expect(error.value).toBe('Details Error')
  })

  it('validates required parameters', async () => {
    const { useSafeInfo } = useSafeReads()
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { safeAddress: undefined }
    }

    const { error, safeInfo, fetchSafeInfo } = useSafeInfo(ref(137))
    await fetchSafeInfo()

    expect(error.value).toBe('Invalid Safe address')
    expect(safeInfo.value).toBeNull()
    expect(axiosGetMock).not.toHaveBeenCalled()
  })
})
