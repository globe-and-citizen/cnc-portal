<!-- DepositModal.vue -->
<template>
  <div>
    <!-- Deposit Button -->
    <UButton
      color="secondary"
      leading-icon="heroicons-outline:plus"
      label="Deposit"
      @click="openModal"
      data-test="deposit-button"
    />

    <!-- Deposit Modal -->
    <UModal
      v-if="DepositModal.mount"
      v-model:open="DepositModal.show"
      data-test="deposit-modal"
      :close="{ onClick: closeModal }"
    >
      <template #body>
        <DepositSafeForm
          v-if="bankAddress"
          :safe-address="bankAddress"
          title="Deposit to Bank Contract"
          @close-modal="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">

import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'
import { ref } from 'vue'
import { type Address } from 'viem'

interface Props {
  bankAddress: Address
}

defineProps<Props>()

const DepositModal = ref({
  mount: false,
  show: false
})

const openModal = () => {
  DepositModal.value = { mount: true, show: true }
}

const closeModal = () => {
  DepositModal.value = { mount: false, show: false }
}
</script>
