<template>
  <div>
    <div
      :class="{ tooltip: !canDeposit }"
      :data-tip="!canDeposit ? 'SHER compensation deposits are not available' : null"
    >
      <ButtonUI
        variant="primary"
        outline
        :disabled="!canDeposit || !safeAddress"
        data-test="invest-in-safe-button"
        @click="openModal"
      >
        <template #prefix>
          <IconifyIcon icon="heroicons-outline:plus" class="w-4 h-4" />
        </template>
        Invest & Get SHER
      </ButtonUI>
    </div>

    <ModalComponent
      v-model="modal.show"
      v-if="modal.mount"
      data-test="invest-in-safe-modal"
      @reset="closeModal"
    >
      <SafeDepositRouterForm
        v-if="safeAddress"
        :safe-address="safeAddress"
        @close-modal="closeModal"
        ref="depositFormRef"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { type Address } from 'viem'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import SafeDepositRouterForm from '@/components/forms/SafeDepositRouterForm.vue'
import { useSafeDepositRouterReads } from '@/composables/safeDepositRouter'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()

const safeAddress = computed(
  () => teamStore.currentTeamMeta?.data?.safeAddress as Address | undefined
)

const { canDeposit } = useSafeDepositRouterReads()

const modal = ref({ mount: false, show: false })
const depositFormRef = ref<InstanceType<typeof DepositRouterForm> | null>(null)

function openModal() {
  modal.value = { mount: true, show: true }
}

function closeModal() {
  depositFormRef.value?.reset()
  modal.value = { mount: false, show: false }
}
</script>
