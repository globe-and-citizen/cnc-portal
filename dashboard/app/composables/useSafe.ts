import { ref } from 'vue'
import { useConnection } from '@wagmi/vue'
import Safe, { type PredictedSafeProps, type SafeAccountConfig, type Eip1193Provider } from '@safe-global/protocol-kit'
import { createPublicClient, custom, formatEther, isAddress } from 'viem'

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

const SAFE_VERSION = '1.4.1'

/**
 * Get the injected EIP-1193 provider.
 */
function getInjectedProvider(): Eip1193Provider {
  const provider = (globalThis.window as Window & typeof globalThis)?.ethereum
  if (!provider) throw new Error('No injected Ethereum provider (window.ethereum) found')
  return provider
}

/**
 * Convert random bytes to hex nonce (string)
 */
function randomSaltNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function buildPredictedSafe(owners: string[], threshold: number, saltNonce: string): PredictedSafeProps {
  const safeAccountConfig: SafeAccountConfig = { owners, threshold }
  return {
    safeAccountConfig,
    safeDeploymentConfig: {
      saltNonce,
      safeVersion: SAFE_VERSION
    }
  }
}

export function useSafe() {
  const connection = useConnection()
  const isBusy = ref(false)
  /**
   * Deploy a new Safe using the connected wallet as signer.
   * - owners: array of addresses
   * - threshold: number
   *
   * Returns deployed safe address string
   */
  async function deploySafe(owners: string[], threshold: number) {
    if (!connection.isConnected.value || !connection.address.value) {
      throw new Error('Wallet not connected')
    }

    // Basic validation
    if (!owners || owners.length === 0) throw new Error('At least one owner required')
    if (threshold < 1 || threshold > owners.length) throw new Error(`Threshold must be between 1 and ${owners.length}`)
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
    if (!connection.isConnected.value || !connection.address.value) throw new Error('Wallet not connected')

    isBusy.value = true
    try {
      const safeSdk = await Safe.init({
        provider: getInjectedProvider(),
        signer: connection.address.value,
        safeAddress
      })
      return safeSdk
    } finally {
      isBusy.value = false
    }
  }

  /**
   * Get connected signer address (via wagmi) and balance (in ETH string)
   */
  async function getDeployerInfo() {
    if (!connection.isConnected.value || !connection.address.value) throw new Error('Wallet not connected')
    const publicClient = createPublicClient({
      transport: custom(getInjectedProvider())
    })
    const balance = await publicClient.getBalance({ address: connection.address.value as `0x${string}` })
    return {
      address: connection.address.value,
      balanceEth: formatEther(balance)
    }
  }

  return {
    isBusy,
    deploySafe,
    loadSafe,
    getDeployerInfo
  }
}
