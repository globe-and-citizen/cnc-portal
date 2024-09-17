<template>
  <h4 class="font-bold text-lg">Deploy Advertisement Campaign contract</h4>
  <div class="flex flex-col gap-5">
    <h3 class="pt-8">
      By clicking "Deploy Advertisement
    </h3>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">Bank Contract</span>
      <input type="string" class="grow"  v-model="_bankAddress" required disabled />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">click rate</span>
      <input type="number" class="grow" placeholder="cost per click in matic" v-model="costPerClick" required />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">impression rate</span>
      <input type="number" class="grow" placeholder="cost per in matic" v-model="costPerImpression"  required />
    </label>
  </div>
  
  <h3 class="pt-8">
    By clicking "Deploy Advertisement Contract" you agree to deploy an advertisment campaign contract and this may take
    some time and pay for gas fee. 
    <button class="btn btn-secondary btn-xs" @click="viewContractCode()" >
     view code
    </button>
  </h3>

  <div class="modal-action justify-right">
    <LoadingButton color="primary" class="w-44" v-if="loading" />
    <button class="btn btn-primary btn-sm" @click="emitCreateAddCampaign" v-if="!loading">
      confirm
    </button>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'

import { ref,computed,watch  } from 'vue'
const emit=defineEmits(['createAddCampaign'])
const props=defineProps<{
  loading: boolean,
  bankAddress: string
}>()

const costPerClick= ref()
const costPerImpression= ref()
const _bankAddress= ref("")

watch(
  () => props.bankAddress, // Watching the prop
  (newBankAddress) => {
    _bankAddress.value = newBankAddress; // Update _bankAddress when bankAddress prop changes
    console.log("Received bank address:", newBankAddress);
  },
  { immediate: true } // Ensure it runs the first time when the component is initialized
);

const viewContractCode = () => {
  const url = 'https://polygonscan.com/address/0x30625FE0E430C3cCc27A60702B79dE7824BE7fD5#code'; // Replace with your desired URL
  window.open(url, '_blank');
}

const emitCreateAddCampaign = () => {
  if (costPerClick.value !== null && costPerClick.value !== undefined &&
      costPerImpression.value !== null && costPerImpression.value !== undefined) {
    emit('createAddCampaign',  costPerClick.value, costPerImpression.value )
  } else {
    alert('Please enter valid numeric values for both rates.')
  }
}

</script>
