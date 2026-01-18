import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import Safe, {
  type PredictedSafeProps,
  type SafeAccountConfig,
  type Eip1193Provider
} from '@safe-global/protocol-kit'
import { createPublicClient, custom, formatEther, isAddress } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { AxiosError } from 'axios'
import { TX_SERVICE_BY_CHAIN } from './types'

const SAFE_VERSION = '1.4.1'
const safeInstanceCache = new Map<string, Promise<Safe>>()

function safeCacheKey(safeAddress: string, signer: string) {
  return `${safeAddress.toLowerCase()}::${signer.toLowerCase()}`
}

async function getSafeInstance(safeAddress: string, signer: string) {
  const key = safeCacheKey(safeAddress, signer)
  const cached = safeInstanceCache.get(key)
  if (cached) return cached
  const promise = Safe.init({
    provider: getInjectedProvider(),
    signer,
    safeAddress
  })
  safeInstanceCache.set(key, promise)
  promise.catch(() => safeInstanceCache.delete(key))
  return promise
}

/**
 * Get the injected EIP-1193 provider.
 */
function getInjectedProvider(): Eip1193Provider {
  const provider = (globalThis.window as Window & typeof globalThis)?.ethereum as unknown
  if (!provider) throw new Error('No injected Ethereum provider (window.ethereum) found')
  if (typeof (provider as { request?: unknown }).request !== 'function') {
    throw new Error('Injected provider does not implement EIP-1193 request method')
  }
  return provider as Eip1193Provider
}

/**
 * Convert random bytes to hex nonce (string)
 */
function randomSaltNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  )
}

function buildPredictedSafe(
  owners: string[],
  threshold: number,
  saltNonce: string
): PredictedSafeProps {
  const safeAccountConfig: SafeAccountConfig = { owners, threshold }
  return {
    safeAccountConfig,
    safeDeploymentConfig: {
      saltNonce,
      safeVersion: SAFE_VERSION
    }
  }
}

export function useSafeWrites() {
  const connection = useConnection()
  const chainId = useChainId()
  const isBusy = ref(false)
  const queryClient = useQueryClient()

  // Query keys (align with reads.ts TanStack Query usage)
  const QUERY_KEYS = {
    safeInfo: (cid: number, address: string) => ['safeInfo', cid, address],
    safeOwners: (cid: number, address: string) => ['safeOwners', cid, address],
    safeThreshold: (cid: number, address: string) => ['safeThreshold', cid, address],
    safeTransactions: (
      cid: number,
      address: string,
      filter: 'queued' | 'executed' | 'all' = 'all'
    ) => ['safeTransactions', cid, address, filter]
  } as const

  type SafeQueryScope = 'info' | 'owners' | 'threshold' | 'transactions' | 'all'

  // Helper to invalidate Safe-related queries after writes
  async function invalidateSafeQueries(
    safeAddress: string,
    scope: SafeQueryScope = 'all',
    options?: { filter?: 'queued' | 'executed' | 'all' }
  ) {
    const cid = chainId.value
    if (!safeAddress || !cid) return

    const tasks: Promise<unknown>[] = []
    const filter = options?.filter ?? 'all'

    if (scope === 'info' || scope === 'all') {
      tasks.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.safeInfo(cid, safeAddress) }))
    }
    if (scope === 'owners' || scope === 'all') {
      tasks.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.safeOwners(cid, safeAddress) }))
    }
    if (scope === 'threshold' || scope === 'all') {
      tasks.push(queryClient.invalidateQueries({ queryKey: QUERY_KEYS.safeThreshold(cid, safeAddress) }))
    }
    if (scope === 'transactions' || scope === 'all') {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.safeTransactions(cid, safeAddress, filter)
        })
      )
    }

    await Promise.all(tasks)
  }

  /**
   * Deploy a new Safe using the connected wallet as signer.
   */
  async function deploySafe(owners: string[], threshold: number) {
    if (!connection.isConnected.value || !connection.address.value) {
      throw new Error('Wallet not connected')
    }

    // Basic validation
    if (!owners || owners.length === 0) throw new Error('At least one owner required')
    if (threshold < 1 || threshold > owners.length)
      throw new Error(`Threshold must be between 1 and ${owners.length}`)
    owners.forEach((o, i) => {
      if (!isAddress(o)) throw new Error(`Invalid owner address [${i}]: ${o}`)
    })

    isBusy.value = true
    try {
      const provider = getInjectedProvider()
      const saltNonce = randomSaltNonce()
      const predictedSafe = buildPredictedSafe(owners, threshold, saltNonce)

      // Initialize Protocol Kit with predicted Safe (needed for deployment)
      const safeSdk = await Safe.init({
        provider,
        signer: connection.address.value,
        predictedSafe
      })

      const deploymentTx = await safeSdk.createSafeDeploymentTransaction()
      const walletClient = await safeSdk.getSafeProvider().getExternalSigner()
      if (!walletClient) throw new Error('Wallet signer not available')

      // Send deployment transaction through the connected wallet
      const txHash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: deploymentTx.to as `0x${string}`,
        data: deploymentTx.data as `0x${string}`,
        value: BigInt(deploymentTx.value || '0'),
        chain: null
      })

      // Wait for deployment to be mined
      const publicClient = safeSdk.getSafeProvider().getExternalProvider()
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      const safeAddress = await safeSdk.getAddress()

      // Invalidate all Safe queries for the new address
      await invalidateSafeQueries(safeAddress, 'all')

      return safeAddress
    } finally {
      isBusy.value = false
    }
  }

  /**
   * Load an existing Safe SDK instance (connected wallet signer)
   */
  async function loadSafe(safeAddress: string) {
    if (!isAddress(safeAddress)) throw new Error('Invalid Safe address')
    if (!connection.isConnected.value || !connection.address.value)
      throw new Error('Wallet not connected')

    isBusy.value = true
    try {
      return await getSafeInstance(safeAddress, connection.address.value)
    } finally {
      isBusy.value = false
    }
  }

  /**
   * Get connected signer address (via wagmi) and balance (in ETH string)
   */
  async function getDeployerInfo() {
    if (!connection.isConnected.value || !connection.address.value)
      throw new Error('Wallet not connected')
    const publicClient = createPublicClient({
      transport: custom(getInjectedProvider())
    })
    const balance = await publicClient.getBalance({
      address: connection.address.value as `0x${string}`
    })
    return {
      address: connection.address.value,
      balanceEth: formatEther(balance)
    }
  }

  /**
   * Approve a Safe transaction (sign and submit signature to the Safe Transaction Service)
   */
  async function approveTransaction(safeAddress: string, safeTxHash: string) {
    if (!isAddress(safeAddress)) throw new Error('Invalid Safe address')
    if (!safeTxHash) throw new Error('Missing Safe transaction hash')
    if (!connection.isConnected.value || !connection.address.value)
      throw new Error('Wallet not connected')

    isBusy.value = true
    try {
      const currentChainId = chainId.value
      const txService = TX_SERVICE_BY_CHAIN[currentChainId]
      if (!txService) throw new Error(`Unsupported chainId: ${currentChainId}`)

      // Initialize Safe SDK with connected wallet
      const safeSdk = await getSafeInstance(safeAddress, connection.address.value)

      // Sign the transaction hash (EIP-712)
      const signature = await safeSdk.signHash(safeTxHash)

      // Submit the signature to the Safe Transaction Service using Axios
      try {
        await apiClient.post(
          `${txService.url}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
          { signature: signature.data },
          { headers: { 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        const axiosError = error as AxiosError
        const apiMessage = axiosError.response?.data && typeof axiosError.response.data === 'object'
          ? (axiosError.response.data as { message?: string }).message
          : undefined
        const message = apiMessage || axiosError.message || 'Failed to confirm transaction'
        console.error('Failed to confirm transaction:', message, error)
        throw new Error(message)
      }

      // Signature added: refresh queued transactions for this Safe
      await invalidateSafeQueries(safeAddress, 'transactions', { filter: 'queued' })

      return signature.data
    } finally {
      isBusy.value = false
    }
  }

  /**
   * Execute a Safe transaction (on-chain, requires threshold signatures)
   */
  async function executeTransaction(safeAddress: string, safeTxHash: string) {
    if (!isAddress(safeAddress)) throw new Error('Invalid Safe address')
    if (!safeTxHash) throw new Error('Missing Safe transaction hash')
    if (!connection.isConnected.value || !connection.address.value)
      throw new Error('Wallet not connected')

    isBusy.value = true
    try {
      const currentChainId = chainId.value
      const txService = TX_SERVICE_BY_CHAIN[currentChainId]
      if (!txService) throw new Error(`Unsupported chainId: ${currentChainId}`)

      // Initialize Safe SDK with connected wallet
      const safeSdk = await getSafeInstance(safeAddress, connection.address.value)

      // Fetch the transaction from the service using Axios
      let serviceTx
      try {
        const { data } = await apiClient.get(
          `${txService.url}/api/v1/multisig-transactions/${safeTxHash}/`
        )
        serviceTx = data
      } catch (error) {
        const axiosError = error as AxiosError
        const apiMessage = axiosError.response?.data && typeof axiosError.response.data === 'object'
          ? (axiosError.response.data as { message?: string }).message
          : undefined
        const message = apiMessage || axiosError.message || 'Transaction not found'
        console.error('Failed to fetch transaction:', message, error)
        throw new Error(message)
      }

      // Execute the transaction (will send on-chain tx)
      const txResponse = await safeSdk.executeTransaction(serviceTx)
      const txHash =
        (txResponse.transactionResponse as { hash?: string } | undefined)?.hash || txResponse.hash
      const waitFn = (
        txResponse.transactionResponse as { wait?: () => Promise<unknown> } | undefined
      )?.wait
      if (typeof waitFn === 'function') {
        await waitFn()
      }

      // Executed: refresh everything (owners/threshold may change depending on tx)
      await invalidateSafeQueries(safeAddress, 'all')

      return txHash
    } finally {
      isBusy.value = false
    }
  }

  return {
    isBusy,
    deploySafe,
    loadSafe,
    getDeployerInfo,
    approveTransaction,
    executeTransaction,
    // Expose query keys and invalidation helpers for consumers
    queryKeys: QUERY_KEYS,
    invalidateSafeQueries
  }
}

export default useSafeWrites
