import { ref, watch } from 'vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import type { Address } from 'viem'
import { FEE_COLLECTOR_ADDRESS } from '@/constant'
import { FEE_COLLECTOR_ABI } from '@/artifacts/abi/feeCollector'

export const useTokenWithdraw = () => {
  const toast = useToast()

  const {
    data: hashWithdraw,
    writeContract: executeWithdraw,
    isPending: isLoadingWithdraw,
    error: errorWithdraw
  } = useWriteContract()

  const {
    isLoading: isConfirmingWithdraw,
    isSuccess: isConfirmedWithdraw
  } = useWaitForTransactionReceipt({
    hash: hashWithdraw
  })

  // Callbacks
  const onSuccess = ref<(() => void) | null>(null)

  watch(isConfirmedWithdraw, async (ok) => {
    if (!ok) return
    if (onSuccess.value) {
      onSuccess.value()
    }
  })

  watch(errorWithdraw, (err) => {
    if (!err) return
    console.error('Withdraw error:', err.message)
    toast.add({
      title: 'Error',
      description: 'Failed to withdraw fees',
      color: 'error'
    })
  })

  // Sweep everything held by the collector (native + every supported ERC20)
  // to the configured fee beneficiary (or owner if unset).
  const withdraw = (successCallback?: () => void) => {
    if (successCallback) {
      onSuccess.value = successCallback
    }

    executeWithdraw({
      address: FEE_COLLECTOR_ADDRESS as Address,
      abi: FEE_COLLECTOR_ABI,
      functionName: 'withdraw',
      args: []
    })
  }

  return {
    withdraw,
    isLoadingWithdraw,
    isConfirmingWithdraw,
    isConfirmedWithdraw,
    errorWithdraw
  }
}
