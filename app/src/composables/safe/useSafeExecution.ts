import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useToastStore } from '@/stores'
import { useExecuteTransactionMutation } from '@/queries/safe.queries'
import { useSafeSDK } from './useSafeSdk'
import type { SafeTransaction, SafeMultisigTransactionResponse } from '@/types/safe'
import { transformToSafeMultisigResponse } from '@/utils/safe'

/**
 * Execute Safe transactions
 */
export function useSafeExecution() {
  const connection = useConnection()
  const chainId = useChainId()
  const { addSuccessToast, addErrorToast } = useToastStore()
  const mutation = useExecuteTransactionMutation()
  const { loadSafe } = useSafeSDK()

  const isExecuting = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Execute a Safe transaction on-chain
   * @param safeAddress - Safe wallet address
   * @param safeTxHash - Transaction hash
   * @param transactionData - Optional transaction data (avoids additional query)
   */
  const executeTransaction = async (
    safeAddress: string,
    safeTxHash: string,
    transactionData?: SafeTransaction
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      error.value = new Error('Invalid Safe address')
      addErrorToast('Invalid Safe address')
      return null
    }

    if (!safeTxHash) {
      error.value = new Error('Missing Safe transaction hash')
      addErrorToast('Missing Safe transaction hash')
      return null
    }

    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      addErrorToast('Please connect your wallet')
      return null
    }

    isExecuting.value = true
    error.value = null

    try {
      const currentChainId = chainId.value

      // Use provided transaction data or throw error
      if (!transactionData) {
        throw new Error(
          'Transaction data is required. Please pass the transaction data from the component.'
        )
      }

      // Use centralized SDK manager
      const safeSdk = await loadSafe(safeAddress)

      const sdkTransactionData: SafeMultisigTransactionResponse =
        transformToSafeMultisigResponse(transactionData)
      // Execute the transaction on-chain
      const txResponse = await safeSdk.executeTransaction(sdkTransactionData)
      const txHash =
        (txResponse.transactionResponse as { hash?: string } | undefined)?.hash || txResponse.hash

      // Wait for confirmation (if available)
      const waitFn = (
        txResponse.transactionResponse as { wait?: () => Promise<unknown> } | undefined
      )?.wait

      if (typeof waitFn === 'function') {
        await waitFn()
      }

      // Trigger query invalidation
      await mutation.mutateAsync({
        chainId: currentChainId,
        safeAddress,
        safeTxHash,
        txHash
      })

      addSuccessToast('Transaction executed successfully')
      return txHash
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to execute transaction')
      console.error('Safe execution error:', err)
      addErrorToast(
        error.value.message.includes('User rejected')
          ? 'Transaction  rejected'
          : error.value.message
      )
      return null
    } finally {
      isExecuting.value = false
    }
  }

  return {
    executeTransaction,
    isExecuting,
    error
  }
}
