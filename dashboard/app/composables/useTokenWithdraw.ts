import { ref, watch } from 'vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { parseUnits, parseEther, type Address } from 'viem'
import { FEE_COLLECTOR_ADDRESS } from '@/constant'
import { FEE_COLLECTOR_ABI } from '@/artifacts/abi/feeCollector'
import type { TokenDisplay } from '@/types/token'

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
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to withdraw tokens',
      color: 'error'
    })
  })

  const withdraw = (token: TokenDisplay, amount: string, successCallback?: () => void) => {
    if (successCallback) {
      onSuccess.value = successCallback
    }

    try {
      const parsedAmount = token.isNative
        ? parseEther(amount)
        : parseUnits(amount, token.decimals)

      executeWithdraw({
        address: FEE_COLLECTOR_ADDRESS as Address,
        abi: FEE_COLLECTOR_ABI,
        functionName: token.isNative ? 'withdraw' : 'withdrawToken',
        args: token.isNative
          ? [parsedAmount]
          : [token.address as Address, parsedAmount]
      })
    } catch {
      toast.add({
        title: 'Error',
        description: 'Invalid amount entered',
        color: 'error'
      })
    }
  }

  return {
    withdraw,
    isLoadingWithdraw,
    isConfirmingWithdraw,
    isConfirmedWithdraw,
    errorWithdraw
  }
}
