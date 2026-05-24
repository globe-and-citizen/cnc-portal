import Safe, { type SafeAccountConfig } from '@safe-global/protocol-kit'
import type { SafeVersion } from '@safe-global/types-kit'
import { useConnection } from '@wagmi/vue'
import { isAddress } from 'viem'
import { getInjectedProvider } from '@/utils/safe'
import { getConnectedSigner } from '@/utils/walletUtil'

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

    const signer = getConnectedSigner(connection)

    const cacheKey = `${safeAddress}-${signer}`

    if (safeInstanceCache.has(cacheKey)) {
      return safeInstanceCache.get(cacheKey)!
    }

    const safePromise = Safe.init({
      provider: getInjectedProvider(),
      signer,
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
   * Create a predicted Safe SDK instance.
   * This does not broadcast any transaction on-chain.
   *
   * @param safeAccountConfig - Safe configuration (owners, threshold)
   * @param deploymentConfig - Deployment configuration (saltNonce, safeVersion)
   * @returns Safe SDK instance configured with predicted safe data
   */
  const createPredictedSafeSdk = async (
    safeAccountConfig: SafeAccountConfig,
    deploymentConfig: {
      saltNonce: string
      safeVersion: SafeVersion
    }
  ): Promise<Safe> => {
    const signer = getConnectedSigner(connection)

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
      signer,
      predictedSafe
    })
  }

  return {
    loadSafe,
    clearCache,
    clearSafeCache,
    createPredictedSafeSdk
  }
}
