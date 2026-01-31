<!-- DepositModal.vue -->
<template>
  <div>
    <!-- Deposit Button -->
    <ButtonUI
      variant="secondary"
      class="flex items-center gap-2"
      @click="openModal"
      data-test="deposit-button"
    >
      <IconifyIcon icon="heroicons-outline:plus" class="w-5 h-5" />
      Deposit
    </ButtonUI>

    <!-- Deposit Modal -->
    <ModalComponent
      v-model="DepositModal.show"
      v-if="DepositModal.mount"
      data-test="deposit-modal"
      @reset="closeModal"
    >
      <DepositBankForm @close-modal="closeModal" :bank-address="bankAddress" />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
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
