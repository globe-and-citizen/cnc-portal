import { computed, ref, watch } from 'vue'
import { useWithdrawAll } from '@/composables/FeeCollector/writes'
import { parseErrorV2 } from '@/utils'

export const useTokenWithdraw = () => {
  const toast = useToast()

  const withdrawMutation = useWithdrawAll()

  // Compatibility aliases so existing consumers keep their imported refs.
  const isLoadingWithdraw = computed(() => withdrawMutation.isPending.value)
  const isConfirmingWithdraw = computed(() => withdrawMutation.isPending.value)
  const isConfirmedWithdraw = computed(() => withdrawMutation.isSuccess.value)
  const errorWithdraw = computed(() => withdrawMutation.error.value)

  const onSuccess = ref<(() => void) | null>(null)

  watch(isConfirmedWithdraw, (ok) => {
    if (!ok) return
    if (onSuccess.value) {
      onSuccess.value()
    }
  })

  watch(errorWithdraw, (err) => {
    if (!err) return
    console.error('Withdraw error:', parseErrorV2(err))
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
    withdrawMutation.mutate({ args: [] })
  }

  return {
    withdraw,
    isLoadingWithdraw,
    isConfirmingWithdraw,
    isConfirmedWithdraw,
    errorWithdraw
  }
}
