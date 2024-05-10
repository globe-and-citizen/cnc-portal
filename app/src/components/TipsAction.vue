<template>
  <div class="card bg-white shadow-xl flex flex-row justify-around my-2 p-6 gap-6">
    <div class="grow flex flex-col justify-center">
      <label for="tip-amount" class="text-center">Total Amount</label>
      <div class="w-full flex flex-col justify-between m-6 self-center">
        <input
          type="text"
          placeholder="Input tip amount per member"
          class="py-2 px-4 outline outline-1 outline-neutral-content rounded-md border-neutral-content text-center bg-white"
          v-model="tipAmount"
        />
      </div>
    </div>
    <label class="text-center self-center mt-7">ETH</label>
    <div class="flex flex-col justify-center">
      <label for="tip-amount" class="text-center mb-2">Actions</label>
      <div className="card-actions flex flex-row justify-between mx-8 self-center">
        <LoadingButton v-if="pushTipLoading" color="primary w-full min-w-24" />
        <button
          v-else
          className="btn btn-primary w-full text-white"
          @click="pushTip(addresses, tipAmount)"
        >
          Push Tips
        </button>
        <LoadingButton v-if="sendTipLoading" color="secondary w-full min-w-24" />
        <button
          v-else
          className="btn btn-secondary w-full text-white"
          @click="sendTip(addresses, tipAmount)"
        >
          Send Tips
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import { usePushTip, useSendTip } from '@/composables/tips'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/toast'
import { ToastType } from '@/types'

defineProps<{
  addresses: string[]
}>()
const tipAmount = ref(0)
const {
  pushTip,
  loading: pushTipLoading,
  isSuccess: pushTipSuccess,
  error: pushTipError
} = usePushTip()
const {
  sendTip,
  loading: sendTipLoading,
  isSuccess: sendTipSuccess,
  error: sendTipError
} = useSendTip()

const { show } = useToastStore()
watch(pushTipError, () => {
  show(
    ToastType.Error,
    pushTipError.value.reason ? pushTipError.value.reason : 'Failed to push tip'
  )
})
watch(sendTipError, () => {
  show(
    ToastType.Error,
    sendTipError.value.reason ? sendTipError.value.reason : 'Failed to send tip'
  )
})
watch(pushTipSuccess, () => {
  show(ToastType.Success, 'Tips pushed successfully')
})
watch(sendTipSuccess, () => {
  show(ToastType.Success, 'Tips sent successfully')
})
</script>
