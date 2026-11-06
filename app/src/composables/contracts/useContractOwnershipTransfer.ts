import { computed, ref, watch, type Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { encodeFunctionData, type Address } from 'viem'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import { useBodAddAction } from '@/composables/bod/writes'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import type { TeamContractReadModel } from './readTeamContracts'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'

type OwnershipTarget = Pick<TeamContractReadModel, 'address' | 'abi' | 'type'>

export function useContractOwnershipTransfer(
  row: Readonly<Ref<OwnershipTarget | null>>,
  isBodAction: Ref<boolean>,
  onTransferred: () => void
) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const errorMessage = ref('')
  const rowAddress = computed(() => row.value?.address)
  const addAction = useBodAddAction()
  const transferMutation = useContractWritesV3({
    contractAddress: rowAddress,
    abi: ownablePausableAbi,
    functionName: 'transferOwnership'
  })

  async function transferOwnership(address: Address) {
    errorMessage.value = ''
    const target = row.value
    if (!target) {
      errorMessage.value = 'Select a contract before transferring ownership'
      return
    }
    if (isBodAction.value) {
      const data = encodeFunctionData({
        abi: target.abi,
        functionName: 'transferOwnership',
        args: [address]
      })
      const description = JSON.stringify({
        text: `Transfer ownership of ${target.type} to ${address}`,
        title: 'Ownership Transfer Request'
      })

      addAction.mutate({
        targetAddress: target.address,
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

  watch(
    () => (isBodAction.value ? addAction.error.value : transferMutation.error.value),
    (error) => {
      errorMessage.value = ''
      if (!error) return
      log.error('errorTransferOwnership.value: ', error)
      const classified = classifyError(error)
      if (classified.category !== 'user_rejected') {
        errorMessage.value = classified.userMessage
      }
    }
  )

  return {
    errorMessage,
    isLoading: computed(() => transferMutation.isPending.value || addAction.isPending.value),
    transferOwnership
  }
}
