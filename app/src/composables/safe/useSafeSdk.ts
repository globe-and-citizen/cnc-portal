import Safe from '@safe-global/protocol-kit'
import { useConnection } from '@wagmi/vue'
import { hardhat } from 'viem/chains'
import { E2E_SAFE_INFRA, E2E_SAFE_LIBRARIES } from '@/e2e/chain'
import { getInjectedProvider } from '@/lib/safe/browser'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { getConnectedSigner } from '@/utils/wallet/address'

const safeInstanceCache = new Map<string, Promise<Safe>>()

/**
 * Protocol Kit only knows Safe's canonical deployments. The E2E Hardhat node
 * carries its own copies, seeded before the browser-acceptance suite starts.
 */
const e2eContractNetworks =
  import.meta.env.VITE_E2E === 'true'
    ? {
        [hardhat.id]: {
          safeSingletonAddress: E2E_SAFE_INFRA.singleton,
          safeProxyFactoryAddress: E2E_SAFE_INFRA.proxyFactory,
          fallbackHandlerAddress: E2E_SAFE_INFRA.fallbackHandler,
          multiSendAddress: E2E_SAFE_LIBRARIES.multiSend,
          multiSendCallOnlyAddress: E2E_SAFE_LIBRARIES.multiSendCallOnly
        }
      }
    : undefined

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
    const normalizedSafeAddress = normalizeSafeAddress(safeAddress)
    const signer = getConnectedSigner(connection)

    const cacheKey = `${normalizedSafeAddress}-${signer}`

    if (safeInstanceCache.has(cacheKey)) {
      return safeInstanceCache.get(cacheKey)!
    }

    const safePromise = Safe.init({
      provider: getInjectedProvider(),
      signer,
      safeAddress: normalizedSafeAddress,
      ...(e2eContractNetworks ? { contractNetworks: e2eContractNetworks } : {})
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

    const cacheKey = `${normalizeSafeAddress(safeAddress)}-${connection.address.value}`
    safeInstanceCache.delete(cacheKey)
  }

  return {
    loadSafe,
    clearCache,
    clearSafeCache
  }
}
