import Safe from '@safe-global/protocol-kit'
import { useConnection } from '@wagmi/vue'
import { isAddress } from 'viem'
import { getInjectedProvider } from '@/utils/safe'

const safeInstanceCache = new Map<string, Promise<Safe>>()

/**
 * Centralized Safe SDK instance management
 * Provides caching and lifecycle management for Safe SDK instances
 */
export function useSafeSDK() {
  const connection = useConnection()

  /**
   * Load or get cached Safe SDK instance
   */
  const loadSafe = async (safeAddress: string): Promise<Safe> => {
    if (!isAddress(safeAddress)) {
      throw new Error('Invalid Safe address')
    }

    if (!connection.isConnected.value || !connection.address.value) {
      throw new Error('Wallet not connected')
    }

    const cacheKey = `${safeAddress}-${connection.address.value}`

    if (safeInstanceCache.has(cacheKey)) {
      return safeInstanceCache.get(cacheKey)!
    }

    const safePromise = Safe.init({
      provider: getInjectedProvider(),
      signer: connection.address.value,
      safeAddress
    })

    safeInstanceCache.set(cacheKey, safePromise)

    // Remove from cache on error
    safePromise.catch(() => safeInstanceCache.delete(cacheKey))

    return safePromise
  }

  /**
   * Clear all cached Safe instances
   */
  const clearCache = () => {
    safeInstanceCache.clear()
  }

  /**
   * Clear cached instance for specific Safe
   */
  const clearSafeCache = (safeAddress: string) => {
    if (!connection.address.value) return

    const cacheKey = `${safeAddress}-${connection.address.value}`
    safeInstanceCache.delete(cacheKey)
  }

  return {
    loadSafe,
    clearCache,
    clearSafeCache
  }
}
