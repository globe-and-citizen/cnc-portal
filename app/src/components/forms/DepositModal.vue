<!-- DepositModal.vue -->
<template>
  <UModal
    v-model:open="isOpen"
    data-test="deposit-modal"
    title="Deposit to Bank Contract"
    description="Deposit assets to the Bank contract to fund your team’s operations."
  >
    <UButton
      color="secondary"
      leading-icon="heroicons-outline:plus"
      label="Deposit"
      data-test="deposit-button"
    />

    <template #body>
      <DepositBankForm :bank-address="bankAddress" @close-modal="isOpen = false" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import { ref } from 'vue'
import { type Address } from 'viem'

defineProps<{
  bankAddress: Address
}>()

const isOpen = ref(false)
</script>
