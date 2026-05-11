import { isAddress } from 'viem'
import { useDeploySafeMutation } from '@/queries/safe.mutations'

/**
 * Thin compatibility wrapper around Safe deployment mutation.
 */
export function useSafeDeployment() {
  const toast = useToast()
  const { mutateAsync: deploy, isPending: isDeploying, error } = useDeploySafeMutation()

  const deploySafe = async (owners: string[], threshold: number): Promise<string | null> => {
    if (!owners || owners.length === 0) {
      toast.add({ title: 'Error', description: 'At least one owner required', color: 'error' })
      return null
    }

    for (const owner of owners) {
      if (!isAddress(owner)) {
        toast.add({
          title: 'Error',
          description: `Invalid owner address: ${owner}`,
          color: 'error'
        })
        return null
      }
    }

    try {
      const safeAddress = await deploy({ owners, threshold })

      toast.add({
        title: 'Success',
        description: `Safe deployed successfully at ${safeAddress}`,
        color: 'success'
      })

      return safeAddress
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deploy Safe'

      toast.add({
        title: 'Error',
        description: message.includes('User rejected') ? 'Transaction approval rejected' : message,
        color: 'error'
      })
      return null
    }
  }

  return {
    deploySafe,
    isDeploying,
    error
  }
}
