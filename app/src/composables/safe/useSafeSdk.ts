import Safe, { type SafeAccountConfig } from '@safe-global/protocol-kit'
import type { SafeVersion } from '@safe-global/types-kit'
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

  /**
   * Deploy a new Safe
   * Initializes a Safe SDK instance with predicted safe configuration
   *
   * @param safeAccountConfig - Safe configuration (owners, threshold)
   * @param deploymentConfig - Deployment configuration (saltNonce, safeVersion)
   * @returns Safe SDK instance ready for deployment
   */
  const deploySafe = async (
    safeAccountConfig: SafeAccountConfig,
    deploymentConfig: {
      saltNonce: string
      safeVersion: SafeVersion
    }
  ): Promise<Safe> => {
    if (!connection.isConnected.value || !connection.address.value) {
      throw new Error('Wallet not connected')
    }

    // Validate owners
    const { owners, threshold } = safeAccountConfig
    if (!owners || owners.length === 0) {
      throw new Error('At least one owner required')
    }

    if (threshold < 1 || threshold > owners.length) {
      throw new Error(`Threshold must be between 1 and ${owners.length}`)
    }

    owners.forEach((owner, i) => {
      if (!isAddress(owner)) {
        throw new Error(`Invalid owner address [${i}]: ${owner}`)
      }
    })

    const provider = getInjectedProvider()

    const predictedSafe = {
      safeAccountConfig,
      safeDeploymentConfig: {
        saltNonce: deploymentConfig.saltNonce,
        safeVersion: deploymentConfig.safeVersion
      }
    }

    // Initialize Protocol Kit with predicted Safe
    return Safe.init({
      provider,
      signer: connection.address.value,
      predictedSafe
    })
  }

  return {
    loadSafe,
    clearCache,
    clearSafeCache,
    deploySafe
  }
}
