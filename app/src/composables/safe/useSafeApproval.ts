import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useApproveTransactionMutation } from '@/queries/safe.mutations'
import { useSafeSDK } from './useSafeSdk'

/**
 * Approve Safe transactions
 */
export function useSafeApproval() {
  const connection = useConnection()
  const chainId = useChainId()
  const toast = useToast()
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
      toast.add({
        title: 'Error',
        description: 'Invalid Safe address',
        color: 'error'
      })
      return null
    }

    if (!safeTxHash) {
      error.value = new Error('Missing Safe transaction hash')
      toast.add({
        title: 'Error',
        description: 'Missing transaction hash',
        color: 'error'
      })
      return null
    }

    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      toast.add({
        title: 'Error',
        description: 'Please connect your wallet',
        color: 'error'
      })
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
        pathParams: {
          safeTxHash,
          safeAddress
        },
        queryParams: {
          chainId: chainId.value
        },
        body: {
          signature: {
            data: signature.data,
            signer: connection.address.value
          }
        }
      })

      toast.add({
        title: 'Success',
        description: 'Transaction approved successfully',
        color: 'success'
      })
      return signature.data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to approve transaction')
      console.error('Safe approval error:', err)

      toast.add({
        title: 'Error',
        description: error.value.message.includes('User rejected')
          ? 'Transaction rejected'
          : error.value.message,
        color: 'error'
      })
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
