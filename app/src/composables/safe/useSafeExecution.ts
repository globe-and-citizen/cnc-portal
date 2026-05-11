import { isAddress } from 'viem'
import type { SafeTransaction } from '@/types/safe'
import { useExecuteTransactionMutation } from '@/queries/safe.mutations'

/**
 * Thin compatibility wrapper around Safe execution mutation.
 */
export function useSafeExecution() {
  const toast = useToast()
  const { mutateAsync: execute, isPending: isExecuting, error } = useExecuteTransactionMutation()

  const executeTransaction = async (
    safeAddress: string,
    safeTxHash: string,
    transactionData?: SafeTransaction
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      toast.add({ title: 'Error', description: 'Invalid Safe address', color: 'error' })
      return null
    }

    if (!safeTxHash) {
      toast.add({ title: 'Error', description: 'Missing Safe transaction hash', color: 'error' })
      return null
    }

    if (!transactionData) {
      toast.add({
        title: 'Error',
        description: 'Transaction data is required',
        color: 'error'
      })
      return null
    }

    try {
      const txHash = await execute({
        safeAddress,
        safeTxHash,
        transactionData
      })

      toast.add({
        title: 'Success',
        description: 'Transaction executed successfully',
        color: 'success'
      })
      return txHash
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute transaction'
      toast.add({
        title: 'Error',
        description: message.includes('User rejected') ? 'Transaction rejected' : message,
        color: 'error'
      })
      return null
    }
  }

  return {
    executeTransaction,
    isExecuting,
    error
  }
}
