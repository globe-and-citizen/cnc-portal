import { ref } from 'vue'
import { useConnection } from '@wagmi/vue'
import Safe, { type SafeAccountConfig } from '@safe-global/protocol-kit'
import type { SafeVersion } from '@safe-global/types-kit'
import { isAddress } from 'viem'
import { useToastStore } from '@/stores'
import { getInjectedProvider, randomSaltNonce } from '@/utils/safe' // Use centralized utils

const SAFE_VERSION: SafeVersion = '1.4.1'

/**
 * Deploy a new Safe
 */
export function useSafeDeployment() {
  const connection = useConnection()

  const { addSuccessToast, addErrorToast } = useToastStore()

  const isDeploying = ref(false)
  const error = ref<Error | null>(null)

  const deploySafe = async (owners: string[], threshold: number): Promise<string | null> => {
    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      addErrorToast('Please connect your wallet')
      return null
    }

    // Validation
    if (!owners || owners.length === 0) {
      error.value = new Error('At least one owner required')
      addErrorToast('At least one owner required')
      return null
    }

    if (threshold < 1 || threshold > owners.length) {
      error.value = new Error(`Threshold must be between 1 and ${owners.length}`)
      addErrorToast(`Threshold must be between 1 and ${owners.length}`)
      return null
    }

    owners.forEach((owner, i) => {
      if (!isAddress(owner)) {
        error.value = new Error(`Invalid owner address [${i}]: ${owner}`)
        addErrorToast(`Invalid owner address: ${owner}`)
        throw error.value
      }
    })

    isDeploying.value = true
    error.value = null

    try {
      // Use centralized utilities (no duplication)
      const provider = getInjectedProvider()
      const saltNonce = randomSaltNonce()

      const safeAccountConfig: SafeAccountConfig = {
        owners,
        threshold
      }

      const predictedSafe = {
        safeAccountConfig,
        safeDeploymentConfig: {
          saltNonce,
          safeVersion: SAFE_VERSION
        }
      }

      // Initialize Protocol Kit with predicted Safe
      const safeSdk = await Safe.init({
        provider,
        signer: connection.address.value,
        predictedSafe
      })

      const deploymentTx = await safeSdk.createSafeDeploymentTransaction()
      const walletClient = await safeSdk.getSafeProvider().getExternalSigner()

      if (!walletClient) {
        throw new Error('Wallet signer not available')
      }

      // Send deployment transaction
      const txHash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: deploymentTx.to as `0x${string}`,
        data: deploymentTx.data as `0x${string}`,
        value: BigInt(deploymentTx.value || '0'),
        chain: null
      })

      // Wait for deployment
      const publicClient = safeSdk.getSafeProvider().getExternalProvider()
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      const safeAddress = await safeSdk.getAddress()

      addSuccessToast(`Safe deployed successfully at ${safeAddress}`)

      return safeAddress
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to deploy Safe')
      console.error('Safe deployment error:', err)
      addErrorToast(error.value.message)
      return null
    } finally {
      isDeploying.value = false
    }
  }

  return {
    deploySafe,
    isDeploying,
    error
  }
}
