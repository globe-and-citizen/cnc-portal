import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useToastStore } from '@/stores'
import { useApproveTransactionMutation } from '@/queries/safe.queries'
import { useSafeSDK } from './useSafeSdk'

/**
 * Approve Safe transactions
 */
export function useSafeApproval() {
  const connection = useConnection()
  const chainId = useChainId()
  const { addSuccessToast, addErrorToast } = useToastStore()
  const mutation = useApproveTransactionMutation()
  const { loadSafe } = useSafeSDK() // Use centralized SDK

  const isApproving = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Approve a Safe transaction by signing it
   */
  const approveTransaction = async (
    safeAddress: string,
    safeTxHash: string
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      error.value = new Error('Invalid Safe address')
      addErrorToast('Invalid Safe address')
      return null
    }

    if (!safeTxHash) {
      error.value = new Error('Missing Safe transaction hash')
      addErrorToast('Missing transaction hash')
      return null
    }

    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      addErrorToast('Please connect your wallet')
      return null
    }

    isApproving.value = true
    error.value = null

    try {
      // Use centralized SDK manager (no duplication)
      const safeSdk = await loadSafe(safeAddress)

      // Sign the transaction hash (EIP-712)
      const signature = await safeSdk.signHash(safeTxHash)

      // Submit via mutation
      await mutation.mutateAsync({
        chainId: chainId.value,
        safeAddress,
        safeTxHash,
        signature: {
          data: signature.data,
          signer: connection.address.value
        }
      })

      addSuccessToast('Transaction approved successfully')
      return signature.data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to approve transaction')
      console.error('Safe approval error:', err)
      addErrorToast(error.value.message)
      return null
    } finally {
      isApproving.value = false
    }
  }

  return {
    approveTransaction,
    isApproving,
    error
  }
}
