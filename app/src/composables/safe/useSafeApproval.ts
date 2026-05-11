import { isAddress } from 'viem'
import { useApproveTransactionMutation } from '@/queries/safe.mutations'

/**
 * Thin compatibility wrapper around Safe approval mutation.
 */
export function useSafeApproval() {
  const toast = useToast()
  const { mutateAsync: approve, isPending: isApproving, error } = useApproveTransactionMutation()

  const approveTransaction = async (
    safeAddress: string,
    safeTxHash: string
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      toast.add({
        title: 'Error',
        description: 'Invalid Safe address',
        color: 'error'
      })
      return null
    }

    if (!safeTxHash) {
      toast.add({
        title: 'Error',
        description: 'Missing transaction hash',
        color: 'error'
      })
      return null
    }

    try {
      const signature = await approve({ safeAddress, safeTxHash })
      toast.add({
        title: 'Success',
        description: 'Transaction approved successfully',
        color: 'success'
      })
      return signature
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve transaction'
      toast.add({
        title: 'Error',
        description: message.includes('User rejected') ? 'Transaction rejected' : message,
        color: 'error'
      })
      return null
    }
  }

  return {
    approveTransaction,
    isApproving,
    error
  }
}
