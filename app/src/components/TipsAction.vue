<script setup lang="ts">
import { useTipsStore } from '@/stores/tips'
import { storeToRefs } from 'pinia'
import LoadingButton from './LoadingButton.vue'
import type { AddressLike } from 'ethers';

const tipStore = useTipsStore()
const { pushTip, sendTip } = useTipsStore()
const { totalTipAmount, sendTipLoading, pushTipLoading } = storeToRefs(tipStore)

defineProps<{ addresses: AddressLike[] }>()
</script>

<template>
  <div class="card bg-white shadow-xl flex flex-row justify-around my-2 p-6">
    <div class="flex flex-col justify-center">
      <label for="tip-amount" class="text-center">Total Amount</label>
      <div class="w-[640px] flex flex-col justify-between m-6 self-center">
        <input
          type="text"
          placeholder="Input tip amount per member"
          class="py-2 px-4 outline outline-1 outline-neutral-content rounded-md border-neutral-content text-center bg-white"
          v-model="totalTipAmount"
        />
      </div>
    </div>
    <label class="text-center self-center mt-7">ETH</label>
    <div class="flex flex-col justify-center">
      <label for="tip-amount" class="text-center mb-2">Actions</label>
      <div className="card-actions flex flex-row justify-between mx-8 self-center">
        <LoadingButton v-if="pushTipLoading" color="primary" />
        <button v-else className="btn btn-primary w-full text-white" @click="pushTip(addresses)">
          Push Tips
        </button>
        <LoadingButton v-if="sendTipLoading" color="secondary" />
        <button v-else className="btn btn-secondary w-full text-white" @click="sendTip(addresses)">
          Send Tips
        </button>
      </div>
    </div>
  </div>
</template>
