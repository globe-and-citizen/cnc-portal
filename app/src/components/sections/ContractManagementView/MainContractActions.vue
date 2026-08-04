<template>
  <div class="flex flex-wrap items-center gap-2">
    <UTooltip :text="archivedTooltip || (row.paused ? 'Resume contract' : 'Pause contract')">
      <UButton
        :color="row.paused ? 'info' : 'error'"
        size="sm"
        :aria-label="row.paused ? 'Resume contract' : 'Pause contract'"
        :loading="isLoadingStatus"
        :disabled="actionsDisabled"
        @click="changeContractStatus(row.paused)"
      >
        <IconifyIcon
          v-if="!isLoadingStatus"
          :icon="`heroicons:${row.paused ? 'play' : 'pause-circle'}-solid`"
        />
      </UButton>
    </UTooltip>

    <UTooltip :text="archivedTooltip">
      <UButton
        color="success"
        variant="outline"
        size="sm"
        label="Transfer Ownership"
        :disabled="actionsDisabled"
        @click="showTransferModal = true"
      />
    </UTooltip>

    <UTooltip :text="archivedTooltip">
      <UButton
        color="success"
        variant="outline"
        size="sm"
        label="Pending Actions"
        :disabled="pendingActionsDisabled"
        @click="openPendingActions"
      />
    </UTooltip>

    <UModal
      v-model:open="showTransferModal"
      title="Transfer Ownership"
      description="Transfer contract ownership to a Board of Directors member or an individual team member."
    >
      <template #body>
        <UAlert
          v-if="transferOwnershipErrorMessage"
          color="error"
          variant="soft"
          :description="transferOwnershipErrorMessage"
          class="mb-4"
        />
        <TransferOwnershipForm
          v-if="showTransferModal"
          :is-bod-action="isBodAction"
          :loading="isLoadingTransfer"
          @transfer-ownership="transferOwnership"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="showApprovalModal"
      :ui="{ content: modalWidth }"
      title="Review Pending Actions"
      description="Approve or reject pending board actions before execution."
    >
      <template #body>
        <PendingEventsList
          v-if="showApprovalModal && currentStep === 1"
          :pending-actions="formattedActions"
          @view-details="viewPendingAction"
        />
        <BodApprovalModal
          v-if="showApprovalModal && currentStep === 2"
          :row="selectedRow"
          :loading="isLoadingApproveAction"
          @approve-action="approveAction"
          @close="showApprovalModal = false"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { TableRow } from '@/types/table'
import { useMainContractActions } from '@/composables/contracts/useMainContractActions'
import BodApprovalModal from './BodApprovalModal.vue'
import PendingEventsList from './PendingEventsList.vue'
import TransferOwnershipForm from './forms/TransferOwnershipForm.vue'

const props = defineProps<{
  row: TableRow
}>()
const emit = defineEmits<{
  (event: 'contract-status-changed'): void
}>()

const {
  actionsDisabled,
  pendingActionsDisabled,
  archivedTooltip,
  isBodAction,
  formattedActions,
  modalWidth,
  showTransferModal,
  showApprovalModal,
  transferOwnershipErrorMessage,
  selectedRow,
  currentStep,
  isLoadingStatus,
  isLoadingTransfer,
  isLoadingApproveAction,
  approveAction,
  openPendingActions,
  viewPendingAction,
  transferOwnership,
  changeContractStatus
} = useMainContractActions(toRef(props, 'row'), () => emit('contract-status-changed'))
</script>
