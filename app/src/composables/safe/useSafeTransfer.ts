import { isAddress } from 'viem'
import { useTransferFromSafeMutation } from '@/queries/safe.transfer.mutations'
import { type SafeTransferOptions } from '@/types'

/**
 * Thin compatibility wrapper around Safe transfer mutation.
 */
export function useSafeTransfer() {
  const toast = useToast()
  const { mutateAsync: transfer, isPending: isTransferring, error } = useTransferFromSafeMutation()

  const transferFromSafe = async (
    safeAddress: string,
    options: SafeTransferOptions
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      toast.add({ title: 'Error', description: 'Invalid Safe address', color: 'error' })
      return null
    }

    if (!isAddress(options.to)) {
      toast.add({ title: 'Error', description: 'Invalid recipient address', color: 'error' })
      return null
    }

    if (!options.amount || parseFloat(options.amount) <= 0) {
      toast.add({ title: 'Error', description: 'Invalid transfer amount', color: 'error' })
      return null
    }

    try {
      const result = await transfer({
        safeAddress,
        options
      })

      toast.add({
        title: 'Success',
        description: 'Transfer submitted successfully',
        color: 'success'
      })

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transfer from Safe'
      toast.add({
        title: 'Error',
        description: message.includes('User rejected') ? 'Transaction approval rejected' : message,
        color: 'error'
      })
      return null
    }
  }

  return {
    transferFromSafe,
    isTransferring,
    error
  }
}
