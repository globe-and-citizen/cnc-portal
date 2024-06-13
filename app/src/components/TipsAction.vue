<template>
  <div class="card bg-base-100 shadow-xl flex flex-row justify-around my-2 p-6 gap-6">
    <div class="grow flex flex-col justify-center">
      <label for="tip-amount" class="text-center">Total Amount</label>
      <div class="w-full flex flex-col justify-between m-6 self-center">
        <input
          type="text"
          placeholder="Input tip amount per member"
          class="py-2 px-4 outline outline-1 outline-neutral-content rounded-md border-neutral-content text-center bg-base-200"
          v-model="tipAmount"
        />
      </div>
    </div>
    <label class="text-center self-center mt-7">{{ NETWORK.currencySymbol }}</label>
    <div class="flex flex-col justify-center">
      <label for="tip-amount" class="text-center mb-2">Actions</label>
      <div className="card-actions flex flex-row justify-between mx-8 self-center">
        <LoadingButton v-if="pushTipLoading" color="primary w-full min-w-24" />
        <button
          v-else
          className="btn btn-primary w-full text-white"
          @click="emits('pushTip', tipAmount)"
        >
          Split to Members Wallets
        </button>
        <LoadingButton v-if="sendTipLoading" color="secondary w-full min-w-24" />
        <button
          v-else
          className="btn btn-secondary w-full text-white hidden"
          @click="emits('sendTip', tipAmount)"
        >
          Split to CNC Account
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { NETWORK } from '@/constant'

const emits = defineEmits(['pushTip', 'sendTip'])
const tipAmount = ref(0)
defineProps<{
  pushTipLoading: boolean
  sendTipLoading: boolean
}>()
</script>
