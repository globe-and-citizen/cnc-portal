import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useToastStore } from '@/stores'
import {
  useUpdateSafeOwnersMutation,
  useProposeTransactionMutation // Use Safe query
} from '@/queries/safe.queries'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'
import { useSafeSDK } from './useSafeSdk'
import type { SafeTransaction } from '@safe-global/types-kit'

/**
 * Manage Safe owners (add/remove owners, update threshold)
 */
export function useSafeOwnerManagement() {
  const connection = useConnection()
  const chainId = useChainId()
  const { addSuccessToast, addErrorToast } = useToastStore()
  const updateMutation = useUpdateSafeOwnersMutation()
  const proposeMutation = useProposeTransactionMutation() // ✅ Use Safe query
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
      const currentChainId = chainId.value
      const txService = TX_SERVICE_BY_CHAIN[currentChainId]
      if (!txService) throw new Error(`Unsupported chainId: ${currentChainId}`)

      // Initialize Safe SDK
      const safeSdk = await loadSafe(safeAddress)

      // Create transactions array in the format Safe SDK expects
      const transactions: SafeTransaction[] = []

      // Add owners
      for (const owner of ownersToAdd) {
        const safeTx = await safeSdk.createAddOwnerTx({
          ownerAddress: owner as Address,
          threshold: newThreshold
        })
        transactions.push(safeTx)
      }

      // Remove owners
      for (const owner of ownersToRemove) {
        const safeTx = await safeSdk.createRemoveOwnerTx({
          ownerAddress: owner as Address,
          threshold: newThreshold
        })
        transactions.push(safeTx)
      }

      // Update threshold when no owner operations provided
      if (ownersToAdd.length === 0 && ownersToRemove.length === 0 && newThreshold !== undefined) {
        const safeTx = await safeSdk.createChangeThresholdTx(newThreshold)
        transactions.push(safeTx)
      }

      if (transactions.length === 0) {
        throw new Error('No owner management operations specified')
      }

      // Consolidate transactions (or use single)
      const preparedTx: SafeTransaction =
        transactions.length === 1
          ? transactions[0]!
          : await safeSdk.createTransaction({ transactions: transactions.map((tx) => tx.data) })

      const safeTxHash = await safeSdk.getTransactionHash(preparedTx)
      const signature = await safeSdk.signHash(safeTxHash)

      if (shouldPropose) {
        // Use centralized Safe query mutation
        await proposeMutation.mutateAsync({
          chainId: currentChainId,
          safeAddress,
          safeTxHash,
          safeTx: preparedTx,
          signature: signature.data
        })

        addSuccessToast('Owner management transaction proposed successfully')

        // Invalidate queries via mutation
        await updateMutation.mutateAsync({
          chainId: currentChainId,
          safeAddress,
          safeTxHash,
          signature: signature.data
        })

        return safeTxHash
      } else {
        // Execute directly (if threshold allows)
        const txResponse = await safeSdk.executeTransaction(preparedTx)
        const txHash =
          (txResponse.transactionResponse as { hash?: string } | undefined)?.hash || txResponse.hash

        addSuccessToast('Owner management transaction executed successfully')

        await updateMutation.mutateAsync({
          chainId: currentChainId,
          safeAddress,
          safeTxHash,
          signature: signature.data
        })

        return txHash
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update Safe owners')
      console.error('Owner management error:', err)
      addErrorToast(error.value.message)
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
