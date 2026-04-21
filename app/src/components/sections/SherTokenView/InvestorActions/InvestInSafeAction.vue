<template>
  <div
    :class="{ tooltip: !canDeposit }"
    :data-tip="!canDeposit ? 'SHER compensation deposits are not available' : null"
  >
    <ActionButton
      icon="heroicons-outline:plus"
      icon-bg="bg-teal-50 dark:bg-teal-950"
      icon-color="text-teal-700 dark:text-teal-400"
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/InvestInSafeAction.vue
      title="Invest & Get SHER"
      tone-class="border-cyan-200 bg-cyan-50/60 hover:border-cyan-300 hover:bg-cyan-100/70 disabled:border-cyan-200 disabled:bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/30 dark:hover:border-cyan-800 dark:hover:bg-cyan-900/40 dark:disabled:border-cyan-900 dark:disabled:bg-cyan-950/30"
      :disabled="!canDeposit || !teamStore.getContractAddressByType('Safe')"
      data-test="invest-in-safe-button"
      @click="openModal"
    />
=======
      :disabled="!canDeposit || !teamStore.getContractAddressByType('Safe')"
      data-test="invest-in-safe-button"
      class="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900"
      @click="openModal"
    >
      {{ `Invest &\nGet SHER` }}
    </ActionButton>
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/InvestInSafeButton.vue

    <UModal
      v-if="modal.mount"
      v-model:open="modal.show"
      data-test="invest-in-safe-modal"
      title="Invest in Safe"
      description="Deposit funds into the Safe for SHER distribution and team treasury operations."
      :close="{ onClick: closeModal }"
    >
      <template #body>
        <SafeDepositRouterForm
          v-if="teamStore.getContractAddressByType('Safe')"
          @close-modal="closeModal"
          ref="depositFormRef"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SafeDepositRouterForm from '@/components/forms/SafeDepositRouterForm.vue'
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import {
  useSafeDepositRouterDepositsEnabled,
  useSafeDepositRouterPaused
} from '@/composables/safeDepositRouter/reads'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/InvestInSafeAction.vue
// Read individual composables
const { data: depositsEnabled, isLoading: isDepositsEnabledLoading } =
  useSafeDepositRouterDepositsEnabled()
const { data: isPaused, isLoading: isPausedLoading } = useSafeDepositRouterPaused()
// Computed property to determine if deposits are allowed
=======

const { data: depositsEnabled, isLoading: isDepositsEnabledLoading } =
  useSafeDepositRouterDepositsEnabled()
const { data: isPaused, isLoading: isPausedLoading } = useSafeDepositRouterPaused()

>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/InvestInSafeButton.vue
const canDeposit = computed(() => {
  if (isDepositsEnabledLoading.value || isPausedLoading.value) return false
  return depositsEnabled.value === true && isPaused.value === false
})

const modal = ref({ mount: false, show: false })

function openModal() {
  modal.value = { mount: true, show: true }
}

function closeModal() {
  modal.value = { mount: false, show: false }
}
</script>
