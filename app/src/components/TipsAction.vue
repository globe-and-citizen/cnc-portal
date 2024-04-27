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
        <LoadingButton v-if="pushTipLoading" color="primary" />
        <button
          v-else
          className="btn btn-primary w-full text-white"
          @click="emits('pushTip', addresses, tipAmount)"
        >
          Push Tips
        </button>
        <LoadingButton v-if="sendTipLoading" color="secondary" />
        <button
          v-else
          className="btn btn-secondary w-full text-white"
          @click="emits('sendTip', addresses, tipAmount)"
        >
          Send Tips
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import { ref, watch } from 'vue'
import type { AddressLike } from 'ethers'

const props = defineProps<{
  addresses: AddressLike[]
  pushTipLoading: boolean
  sendTipLoading: boolean
  tipAmount: number
}>()
const emits = defineEmits(['pushTip', 'sendTip'])

const tipAmount = ref(props.tipAmount)
const pushTipLoading = ref<boolean>(props.pushTipLoading)
const sendTipLoading = ref<boolean>(props.sendTipLoading)
watch(
  [() => props.pushTipLoading, () => props.sendTipLoading],
  ([pushTipLoadingNew, sendTipLoadingNew]) => {
    pushTipLoading.value = pushTipLoadingNew
    sendTipLoading.value = sendTipLoadingNew
  }
)
</script>
