<template>
  <h1 class="font-bold text-2xl">Deposit to Team Bank Contract</h1>
  <h3 class="pt-8">
    This will deposit {{ amount }} {{ NETWORK.currencySymbol }} to the team bank contract.
  </h3>

  <input type="text" class="input input-bordered w-full mt-8" v-model="amount" />

  <div class="modal-action justify-center">
    <LoadingButton color="primary" class="w-24" v-if="loading" />
    <button class="btn btn-primary" @click="$emit('deposit', amount)" v-if="!loading">
      Deposit
    </button>
    <button class="btn btn-error" @click="$emit('closeModal')">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import { NETWORK } from '@/constant'
import { ref } from 'vue'

const amount = ref<string>('0')
defineEmits(['deposit', 'closeModal'])
defineProps<{
  loading: boolean
}>()
</script>
