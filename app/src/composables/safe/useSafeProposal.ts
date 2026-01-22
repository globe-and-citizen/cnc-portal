import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useToastStore } from '@/stores'
import { useProposeTransactionMutation } from '@/queries/safe.queries'
import { useSafeSDK } from './useSafeSdk'

/**
 * Propose Safe transactions
 */
export function useSafeProposal() {
  const connection = useConnection()
  const chainId = useChainId()
  const { addSuccessToast, addErrorToast } = useToastStore()
  const mutation = useProposeTransactionMutation()
  const { loadSafe } = useSafeSDK() // Use centralized SDK

  const isProposing = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Propose a Safe transaction
   */
  const proposeTransaction = async (
    safeAddress: string,
    transactionData: {
      to: string
      value: string
      data: string
      operation?: number
    }
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      error.value = new Error('Invalid Safe address')
      addErrorToast('Invalid Safe address')
      return null
    }

    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      addErrorToast('Please connect your wallet')
      return null
    }

    isProposing.value = true
    error.value = null

    try {
      // Use centralized SDK manager (no duplication)
      const safeSdk = await loadSafe(safeAddress)

      // Create Safe transaction
      const safeTransaction = await safeSdk.createTransaction({
        transactions: [
          {
            to: transactionData.to,
            value: transactionData.value,
            data: transactionData.data,
            operation: transactionData.operation ?? 0
          }
        ]
      })

      // Get transaction hash and sign
      const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
      const signature = await safeSdk.signHash(safeTxHash)

      // Propose via mutation
      await mutation.mutateAsync({
        chainId: chainId.value,
        safeAddress,
        transactionData: safeTransaction.data,
        signature: {
          data: signature.data,
          signer: connection.address.value
        }
      })

      addSuccessToast('Transaction proposed successfully')
      return safeTxHash
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to propose transaction')
      console.error('Safe proposal error:', err)
      addErrorToast(error.value.message)
      return null
    } finally {
      isProposing.value = false
    }
  }

  return {
    proposeTransaction,
    isProposing,
    error
  }
}
