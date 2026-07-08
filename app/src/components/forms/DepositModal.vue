<!-- DepositModal.vue -->
<template>
  <UModal
    v-model:open="isOpen"
    data-test="deposit-modal"
    title="Deposit to Bank Contract"
    description="Deposit assets to the Bank contract to fund your team’s operations."
  >
    <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
      <UButton
        color="secondary"
        leading-icon="heroicons-outline:plus"
        label="Deposit"
        data-test="deposit-button"
        :disabled="archivedDisabled"
      />
    </TeamArchivedTooltip>

    <template #body>
      <DepositBankForm :bank-address="bankAddress" @close-modal="isOpen = false" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { ref, watch } from 'vue'
import { type Address } from 'viem'

defineProps<{
  bankAddress: Address
}>()

const isOpen = ref(false)
const { isWriteDisabled } = useTeamWriteGuard()

watch(isOpen, (open) => {
  if (open && isWriteDisabled.value) {
    isOpen.value = false
  }
})
</script>
