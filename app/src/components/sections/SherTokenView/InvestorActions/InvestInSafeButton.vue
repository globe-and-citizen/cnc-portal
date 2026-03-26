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

    <ModalComponent
      v-model="modal.show"
      v-if="modal.mount"
      data-test="invest-in-safe-modal"
      @reset="closeModal"
    >
      <SafeDepositRouterForm
        v-if="teamStore.getContractAddressByType('Safe')"
        @close-modal="closeModal"
        ref="depositFormRef"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

import ModalComponent from '@/components/ModalComponent.vue'
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
