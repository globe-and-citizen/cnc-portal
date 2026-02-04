import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useToastStore } from '@/stores'
import { useUpdateSafeOwnersMutation } from '@/queries/safe.queries'
import { useSafeSDK } from './useSafeSdk'
import { useSafeProposal } from './useSafeProposal'
import { currentChainId } from '@/constant'

/**
 * Manage Safe owners (add/remove owners, update threshold)
 */
export function useSafeOwnerManagement() {
  const connection = useConnection()
  const chainId = useChainId()
  const { addSuccessToast, addErrorToast } = useToastStore()
  const updateMutation = useUpdateSafeOwnersMutation()
  const { proposeTransaction } = useSafeProposal()
  const { loadSafe } = useSafeSDK()

  const isUpdating = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Update Safe owners and/or threshold
   */
  const updateOwners = async (
    safeAddress: string,
    options: {
      ownersToAdd?: string[]
      ownersToRemove?: string[]
      newThreshold?: number
      shouldPropose?: boolean
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

    const { ownersToAdd = [], ownersToRemove = [], newThreshold, shouldPropose = true } = options

    // Validation
    if (ownersToAdd.length === 0 && ownersToRemove.length === 0 && newThreshold === undefined) {
      error.value = new Error('No owner management operations specified')
      addErrorToast('No owner management operations specified')
      return null
    }

    // Validate all addresses
    for (const owner of [...ownersToAdd, ...ownersToRemove]) {
      if (!isAddress(owner)) {
        error.value = new Error(`Invalid owner address: ${owner}`)
        addErrorToast(`Invalid owner address: ${owner}`)
        return null
      }
    }

    isUpdating.value = true
    error.value = null

    try {
      // Initialize Safe SDK
      const safeSdk = await loadSafe(safeAddress)
      const currentThreshold = await safeSdk.getThreshold()

      // Build the batch transaction data
      const transactionData: Array<{
        to: string
        value: string
        data: string
        operation: number
      }> = []

      // Add owners
      for (const owner of ownersToAdd) {
        const safeTx = await safeSdk.createAddOwnerTx({
          ownerAddress: owner as Address,
          threshold: newThreshold
        })
        transactionData.push({
          to: safeTx.data.to,
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation || 0
        })
      }

      // Remove owners
      for (const owner of ownersToRemove) {
        const safeTx = await safeSdk.createRemoveOwnerTx({
          ownerAddress: owner as Address,
          threshold: newThreshold || currentThreshold
        })
        transactionData.push({
          to: safeTx.data.to,
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation || 0
        })
      }

      // Update threshold when no owner operations provided
      if (ownersToAdd.length === 0 && ownersToRemove.length === 0 && newThreshold !== undefined) {
        const safeTx = await safeSdk.createChangeThresholdTx(newThreshold)
        transactionData.push({
          to: safeTx.data.to,
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation || 0
        })
      }

      if (transactionData.length === 0) {
        throw new Error('No owner management operations specified')
      }

      if (shouldPropose) {
        // Use single transaction if only one operation, otherwise batch
        let safeTxHash: string | null

        if (transactionData.length === 1) {
          // Single transaction - use proposeTransaction directly
          safeTxHash = await proposeTransaction(safeAddress, transactionData[0]!)
        } else {
          // Multiple transactions - create batch transaction
          const batchTx = await safeSdk.createTransaction({
            transactions: transactionData
          })

          // Propose the batch transaction
          safeTxHash = await proposeTransaction(safeAddress, {
            to: batchTx.data.to,
            value: batchTx.data.value,
            data: batchTx.data.data,
            operation: batchTx.data.operation || 0
          })
        }

        if (!safeTxHash) {
          throw new Error('Failed to propose transaction')
        }

        addSuccessToast('Owner management transaction proposed successfully')
        // Invalidate queries via mutation (no API call, just cache invalidation)
        await updateMutation.mutateAsync({
          pathParams: {
            safeAddress
          },
          queryParams: {
            chainId: chainId.value
          },
          body: {
            ownersToAdd, // Include the actual operation parameters
            ownersToRemove,
            newThreshold,
            shouldPropose: false,
            safeTxHash: safeTxHash // For executions, this is the actual transaction hash
          }
        })
        return safeTxHash
      } else {
        // Execute directly (if threshold allows)
        let txHash: string

        if (transactionData.length === 1) {
          // Single transaction execution
          const safeTx = await safeSdk.createTransaction({
            transactions: [transactionData[0]!]
          })
          const txResponse = await safeSdk.executeTransaction(safeTx)
          txHash =
            (txResponse.transactionResponse as { hash?: string } | undefined)?.hash ||
            txResponse.hash
        } else {
          // Batch transaction execution
          const batchTx = await safeSdk.createTransaction({
            transactions: transactionData
          })
          const txResponse = await safeSdk.executeTransaction(batchTx)
          txHash =
            (txResponse.transactionResponse as { hash?: string } | undefined)?.hash ||
            txResponse.hash
        }

        addSuccessToast('Owner management transaction executed successfully')
        // Invalidate queries after execution
        await updateMutation.mutateAsync({
          pathParams: {
            safeAddress
          },
          queryParams: {
            chainId: currentChainId
          },
          body: {
            ownersToAdd, // Include the actual operation parameters
            ownersToRemove,
            newThreshold,
            shouldPropose: false,
            safeTxHash: txHash // For executions, this is the actual transaction hash
          }
        })
        return txHash
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update Safe owners')
      console.error('Owner management error:', err)
      addErrorToast(
        error.value.message.includes('User rejected') ? 'Transaction rejected' : error.value.message
      )
      return null
    } finally {
      isUpdating.value = false
    }
  }

  return {
    updateOwners,
    isUpdating,
    error
  }
}
