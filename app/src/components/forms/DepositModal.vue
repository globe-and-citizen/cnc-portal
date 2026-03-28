<!-- DepositModal.vue -->
<template>
  <UModal v-model:open="isOpen" data-test="deposit-modal" title="Deposit to Bank Contract">
    <UButton
      color="secondary"
      leading-icon="heroicons-outline:plus"
      label="Deposit"
      data-test="deposit-button"
    />

    <template #body>
      <DepositSafeForm
        :safe-address="bankAddress"
        title="Deposit to Bank Contract"
        @close-modal="isOpen = false"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'
import { ref } from 'vue'
import { type Address } from 'viem'

defineProps<{
  bankAddress: Address
}>()

const isOpen = ref(false)
</script>
