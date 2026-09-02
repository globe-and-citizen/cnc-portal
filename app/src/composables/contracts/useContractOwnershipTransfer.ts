import { computed, ref, watch, type Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { encodeFunctionData, type Address } from 'viem'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import { useBodAddAction } from '@/composables/bod/writes'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import type { TableRow } from '@/types/table'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'

export function useContractOwnershipTransfer(
  row: Ref<TableRow>,
  isBodAction: Ref<boolean>,
  onTransferred: () => void
) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const errorMessage = ref('')
  const rowAddress = computed(() => row.value.address as Address)
  const addAction = useBodAddAction()
  const transferMutation = useContractWritesV3({
    contractAddress: rowAddress,
    abi: ownablePausableAbi,
    functionName: 'transferOwnership'
  })

  async function transferOwnership(address: Address) {
    if (isBodAction.value) {
      const data = encodeFunctionData({
        abi: row.value.abi,
        functionName: 'transferOwnership',
        args: [address]
      })
      const description = JSON.stringify({
        text: `Transfer ownership of ${row.value.type} to ${address}`,
        title: 'Ownership Transfer Request'
      })

      await addAction.executeAddAction({
        targetAddress: row.value.address,
        description,
        data
      })
      return
    }

    transferMutation.mutate(
      { args: [address] },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: ['readContract', { functionName: 'isMember' }],
            exact: false
          })
          void queryClient.invalidateQueries({
            queryKey: ['readContract', { functionName: 'owner' }],
            exact: false
          })
          errorMessage.value = ''
          toast.add({ title: 'Ownership transferred successfully!', color: 'success' })
          onTransferred()
        }
      }
    )
  }

  watch(addAction.isSuccess, (isAdded) => {
    if (isAdded) onTransferred()
  })

  watch(transferMutation.error, (error) => {
    if (!error) return
    log.error('errorTransferOwnership.value: ', error)
    const classified = classifyError(error)
    if (classified.category !== 'user_rejected') {
      errorMessage.value = classified.userMessage
    }
  })

  return {
    errorMessage,
    isLoading: computed(() => transferMutation.isPending.value || addAction.isPending.value),
    transferOwnership
  }
}
