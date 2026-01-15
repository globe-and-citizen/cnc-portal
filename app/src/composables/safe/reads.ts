import { ref, computed, unref, type MaybeRef } from 'vue'
import { formatUnits, isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import type { SafeInfo, SafeBalanceItem, SafeDetails, SafeChainConfig } from './types'

// Safe Transaction Service URLs by chain - following app pattern
const TX_SERVICE_BY_CHAIN: Record<number, SafeChainConfig> = {
  137: {
    chain: 'polygon',
    url: 'https://safe-transaction-polygon.safe.global',
    nativeSymbol: 'POL'
  },
  11155111: {
    chain: 'sepolia',
    url: 'https://safe-transaction-sepolia.safe.global',
    nativeSymbol: 'ETH'
  },
  80002: { chain: 'amoy', url: 'https://safe-transaction-amoy.safe.global', nativeSymbol: 'MATIC' },
  42161: {
    chain: 'arbitrum',
    url: 'https://safe-transaction-arbitrum.safe.global',
    nativeSymbol: 'ETH'
  }
}

// Chain name mappings for Safe app URLs
const CHAIN_NAMES: Record<number, string> = {
  137: 'polygon',
  11155111: 'sepolia',
  80002: 'amoy',
  42161: 'arbitrum'
}

// Cache interface for type safety
interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
}

// Simple cache to avoid excessive requests - following dashboard pattern
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 30000 // 30 seconds

function getCachedData<T = unknown>(key: string): T | null {
  const cached = cache.get(key) as CacheEntry<T> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedData<T = unknown>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Balance response interface
interface BalanceResult {
  balance: string
  symbol: string
}

interface BalanceTotals {
  [code: string]: {
    value: number
    formated: string
    id: string
    code: string
    symbol: string
    price: number
    formatedPrice: string
  }
}

async function fetchSafeBalance(
  txServiceUrl: string,
  safeAddress: string,
  nativeSymbol: string
): Promise<BalanceResult> {
  const cacheKey = `balance_${safeAddress}`
  const cached = getCachedData<BalanceResult>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`${txServiceUrl}/api/v1/safes/${safeAddress}/balances/`)
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('Rate limited on Safe API, using fallback')
        return { balance: '0', symbol: nativeSymbol }
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const data: SafeBalanceItem[] = await res.json()
    const native = data.find((item) => item.tokenAddress === null)

    if (!native) {
      const result: BalanceResult = { balance: '0', symbol: nativeSymbol }
      setCachedData(cacheKey, result)
      return result
    }

    const decimals = native.token?.decimals ?? 18
    const symbol = native.token?.symbol || nativeSymbol
    const balance = formatUnits(BigInt(native.balance || '0'), decimals)

    const result: BalanceResult = { balance, symbol }
    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.warn('Error fetching Safe balance:', error)
    return { balance: '0', symbol: nativeSymbol }
  }
}

async function fetchSafeDetails(txServiceUrl: string, safeAddress: string): Promise<SafeDetails> {
  const cacheKey = `details_${safeAddress}`
  const cached = getCachedData<SafeDetails>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`${txServiceUrl}/api/v1/safes/${safeAddress}/`)
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('Rate limited on Safe API for details')
        const cachedDetails = getCachedData<SafeDetails>(cacheKey)
        if (cachedDetails) return cachedDetails
        throw new Error('Rate limited on Safe API. Please retry shortly.')
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const data = (await res.json()) as {
      owners?: string[]
      threshold?: number
    }
    const result: SafeDetails = {
      owners: data.owners || [],
      threshold: data.threshold || 1
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.warn('Error fetching Safe details:', error)
    return { owners: [], threshold: 1 }
  }
}

/**
 * Safe app URL helpers
 */
export function useSafeAppUrls() {
  /**
   * Generate Safe app URL for home page
   */
  const getSafeHomeUrl = (chainId: number, safeAddress: Address): string => {
    const chainName = CHAIN_NAMES[chainId] || 'ethereum'
    return `https://app.safe.global/home?safe=${chainName}:${safeAddress}`
  }

  /**
   * Generate Safe app URL for settings page
   */
  const getSafeSettingsUrl = (chainId: number, safeAddress: string): string => {
    const chainName = CHAIN_NAMES[chainId] || 'ethereum'
    return `https://app.safe.global/settings/setup?safe=${chainName}:${safeAddress}`
  }

  /**
   * Open Safe app in new tab with proper security attributes
   */
  const openSafeAppUrl = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return {
    getSafeHomeUrl,
    getSafeSettingsUrl,
    openSafeAppUrl
  }
}

/**
 * Safe contract read operations - following dashboard pattern
 */
export function useSafeReads() {
  const teamStore = useTeamStore()
  const currencyStore = useCurrencyStore()

  const safeAddress = computed(() => {
    const teamData = teamStore.currentTeamMeta?.data
    return teamData?.safeAddress as Address | undefined
  })

  const isSafeAddressValid = computed(() => {
    const address = safeAddress.value
    return !!address && isAddress(address)
  })

  const resolveSafeAddress = (addressRef?: MaybeRef<Address | undefined>): Address | undefined => {
    const providedAddress = addressRef ? unref(addressRef) : undefined
    return providedAddress || safeAddress.value
  }

  /**
   * Get Safe info for current team
   */
  const useSafeInfo = (chainId: MaybeRef<number>, addressRef?: MaybeRef<Address | undefined>) => {
    const safeInfo = ref<SafeInfo | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchSafeInfo = async (): Promise<void> => {
      const address = resolveSafeAddress(addressRef)
      const currentChainId = unref(chainId)

      if (!address || !isAddress(address)) {
        error.value = 'Invalid Safe address'
        safeInfo.value = null
        return
      }

      isLoading.value = true
      error.value = null

      try {
        const txService = TX_SERVICE_BY_CHAIN[currentChainId]
        if (!txService) {
          error.value = `Unsupported chainId: ${currentChainId}`
          safeInfo.value = null
          return
        }

        const [balanceData, detailsData] = await Promise.all([
          fetchSafeBalance(txService.url, address, txService.nativeSymbol),
          fetchSafeDetails(txService.url, address)
        ])

        // Compute fiat totals based on native token prices
        const nativePrices = currencyStore.getTokenInfo('native')?.prices ?? []
        const numericBalance = Number(balanceData.balance ?? 0)
        const totals: BalanceTotals = {}
        for (const price of nativePrices) {
          if (price.price == null) continue
          const value = numericBalance * (price.price ?? 0)
          totals[price.code] = {
            value,
            formated: formatCurrencyShort(value, price.code),
            id: price.id,
            code: price.code,
            symbol: price.symbol,
            price: price.price ?? 0,
            formatedPrice: formatCurrencyShort(price.price ?? 0, price.code)
          }
        }

        safeInfo.value = {
          address,
          chain: txService.chain,
          balance: balanceData.balance,
          symbol: balanceData.symbol,
          totals,
          owners: detailsData.owners,
          threshold: detailsData.threshold
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to fetch Safe info'
        console.warn('Safe info fetch error:', errorMsg)
        error.value = 'Unable to load Safe data. Please try again later.'
        safeInfo.value = null
      } finally {
        isLoading.value = false
      }
    }

    return {
      safeInfo,
      isLoading,
      error,
      fetchSafeInfo
    }
  }

  /**
   * Get Safe owners for current team
   */
  const useSafeOwners = (chainId: MaybeRef<number>, addressRef?: MaybeRef<Address | undefined>) => {
    const owners = ref<string[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchOwners = async (): Promise<void> => {
      const address = resolveSafeAddress(addressRef)
      const currentChainId = unref(chainId)

      if (!address || !isAddress(address)) {
        error.value = 'Invalid Safe address'
        owners.value = []
        return
      }

      isLoading.value = true
      error.value = null

      try {
        const txService = TX_SERVICE_BY_CHAIN[currentChainId]
        if (!txService) {
          error.value = `Unsupported chainId: ${currentChainId}`
          owners.value = []
          return
        }

        const details = await fetchSafeDetails(txService.url, address)
        owners.value = details.owners
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to fetch Safe owners'
        console.warn('Safe owners fetch error:', errorMsg)
        if (errorMsg.includes('Rate limited')) {
          error.value = 'Safe API is rate limited. Please try again shortly.'
          return
        }
        error.value = 'Unable to load Safe owners. Please try again later.'
        owners.value = []
      } finally {
        isLoading.value = false
      }
    }

    return {
      owners,
      isLoading,
      error,
      fetchOwners
    }
  }

  /**
   * Get Safe threshold for current team
   */
  const useSafeThreshold = (
    chainId: MaybeRef<number>,
    addressRef?: MaybeRef<Address | undefined>
  ) => {
    const threshold = ref<number>(1)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchThreshold = async (): Promise<void> => {
      const address = resolveSafeAddress(addressRef)
      const currentChainId = unref(chainId)

      if (!address || !isAddress(address)) {
        error.value = 'Invalid Safe address'
        threshold.value = 1
        return
      }

      isLoading.value = true
      error.value = null

      try {
        const txService = TX_SERVICE_BY_CHAIN[currentChainId]
        if (!txService) {
          error.value = `Unsupported chainId: ${currentChainId}`
          threshold.value = 1
          return
        }
        const details = await fetchSafeDetails(txService.url, address)
        threshold.value = details.threshold
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to fetch Safe threshold'
        console.warn('Safe threshold fetch error:', errorMsg)
        error.value = 'Unable to load Safe threshold. Please try again later.'
        threshold.value = 1
      } finally {
        isLoading.value = false
      }
    }

    return {
      threshold,
      isLoading,
      error,
      fetchThreshold
    }
  }

  return {
    safeAddress,
    isSafeAddressValid,
    useSafeInfo,
    useSafeOwners,
    useSafeThreshold,
    useSafeAppUrls
  }
}
