<template>
  <div>
    <div
      :class="{ tooltip: !canDeposit }"
      :data-tip="!canDeposit ? 'SHER compensation deposits are not available' : null"
    >
      <UButton
        color="primary"
        variant="outline"
        :disabled="!canDeposit || !teamStore.getContractAddressByType('Safe')"
        data-test="invest-in-safe-button"
        @click="openModal"
        leading-icon="heroicons-outline:plus"
        label="Invest & Get SHER"
      />
    </div>

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
import {
  useSafeDepositRouterDepositsEnabled,
  useSafeDepositRouterPaused
} from '@/composables/safeDepositRouter/reads'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()

// Read individual composables
const { data: depositsEnabled, isLoading: isDepositsEnabledLoading } =
  useSafeDepositRouterDepositsEnabled()
const { data: isPaused, isLoading: isPausedLoading } = useSafeDepositRouterPaused()

// Computed property to determine if deposits are allowed
const canDeposit = computed(() => {
  // While loading, disable deposits
  if (isDepositsEnabledLoading.value || isPausedLoading.value) {
    return false
  }

  // Can deposit if: deposits are enabled AND contract is not paused
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
