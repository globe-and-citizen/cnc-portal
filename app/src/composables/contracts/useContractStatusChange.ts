import { watch, type Ref } from 'vue'
import { type Address } from 'viem'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'

export function useContractStatusChange(
  contractAddress: Ref<Address>,
  onStatusChanged: () => void
) {
  const toast = useToast()
  const pauseMutation = useContractWritesV3({
    contractAddress,
    abi: ownablePausableAbi,
    functionName: 'pause'
  })
  const unpauseMutation = useContractWritesV3({
    contractAddress,
    abi: ownablePausableAbi,
    functionName: 'unpause'
  })

  function changeContractStatus(paused: boolean) {
    const mutation = paused ? unpauseMutation : pauseMutation
    const successTitle = paused ? 'Contract resumed successfully!' : 'Contract paused successfully!'

    mutation.mutate(
      { args: [] },
      {
        onSuccess: () => {
          toast.add({ title: successTitle, color: 'success' })
          onStatusChanged()
        }
      }
    )
  }

  const watchStatusError = (error: Ref<Error | null>, label: string) =>
    watch(error, (value) => {
      if (!value) return
      log.error(`${label}: `, value)
      const classified = classifyError(value)
      if (classified.category !== 'user_rejected') {
        toast.add({ title: classified.userMessage, color: 'error' })
      }
    })

  watchStatusError(pauseMutation.error, 'errorPauseContract.value')
  watchStatusError(unpauseMutation.error, 'errorUnpauseContract.value')

  return {
    changeContractStatus
  }
}
