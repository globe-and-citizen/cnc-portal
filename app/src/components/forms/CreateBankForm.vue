<template>
  <h1 class="font-bold text-2xl">Create Team Bank Contract</h1>
  <h3 class="pt-8">
    By clicking "Deploy Bank Contract" you agree to deploy the team bank contract and this may take
    some time and pay for gas fee.
  </h3>

  <div class="modal-action justify-center">
    <LoadingButton color="primary" class="w-44" v-if="loading" />
    <button class="btn btn-primary" @click="$emit('createBank')" v-if="!loading">
      Deploy Bank Contract
    </button>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'

defineEmits(['createBank'])
defineProps<{
  loading: boolean
}>()
</script>
