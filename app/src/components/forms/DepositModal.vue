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
    <ModalComponent
      v-model="DepositModal.show"
      v-if="DepositModal.mount"
      data-test="deposit-modal"
      @reset="closeModal"
    >
      <DepositSafeForm
        v-if="bankAddress"
        :safe-address="bankAddress"
        title="Deposit to Bank Contract"
        @close-modal="closeModal"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import ModalComponent from '@/components/ModalComponent.vue'

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
