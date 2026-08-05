<template>
  <div class="flex items-center justify-end gap-2">
    <UButton
      v-if="formattedActions.length"
      color="warning"
      variant="subtle"
      size="sm"
      :label="`${formattedActions.length} Review`"
      icon="i-lucide-clock-3"
      :disabled="pendingActionsDisabled"
      @click="openPendingActions"
    />
    <span v-else class="text-muted hidden items-center gap-1 text-xs lg:inline-flex">
      <UBadge color="neutral" variant="subtle" size="sm" label="0" />
      None
    </span>

    <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-ellipsis"
        aria-label="Contract actions"
        data-test="contract-actions-menu"
      />
    </UDropdownMenu>

    <USlideover
      v-model:open="showDetails"
      title="Contract details"
      description="Technical identifiers and current on-chain state."
      :ui="{ content: 'w-full sm:max-w-xl' }"
    >
      <template #body>
        <div class="space-y-6">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
              <UIcon :name="presentation.icon" class="size-5" />
            </div>
            <div>
              <p class="text-highlighted font-semibold">{{ presentation.label }}</p>
              <p class="text-muted text-sm">{{ row.type }}</p>
            </div>
          </div>

          <dl class="divide-default divide-y text-sm">
            <div class="py-4">
              <dt class="text-muted">Status</dt>
              <dd class="mt-2">
                <UBadge :color="row.paused ? 'warning' : 'success'" variant="subtle">
                  {{ row.paused ? 'Paused' : 'Active' }}
                </UBadge>
              </dd>
            </div>
            <div class="py-4">
              <dt class="text-muted">Contract address</dt>
              <dd class="mt-2"><AddressToolTip :address="row.address" :slice="true" /></dd>
            </div>
            <div class="py-4">
              <dt class="text-muted">Owner</dt>
              <dd class="mt-2">
                <AddressToolTip v-if="row.owner" :address="row.owner" :slice="true" />
                <span v-else class="text-muted">Not available</span>
              </dd>
            </div>
            <div class="py-4">
              <dt class="text-muted">Deployer</dt>
              <dd class="mt-2">
                <AddressToolTip v-if="row.deployer" :address="row.deployer" :slice="true" />
                <span v-else class="text-muted">Not available</span>
              </dd>
            </div>
            <div class="py-4">
              <dt class="text-muted">Officer version</dt>
              <dd class="text-highlighted mt-2">{{ version || 'Unknown' }}</dd>
            </div>
          </dl>

          <USeparator />

          <ContractReadDataSection
            :address="contractAddress"
            :abi="contractAbi"
            :contract-type="row.type"
            :enabled="showDetails"
          />
        </div>
      </template>
    </USlideover>

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
import { computed, ref, toRef } from 'vue'
import { useClipboard } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Abi, Address } from 'viem'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import { NETWORK } from '@/constant'
import { useMainContractActions } from '@/composables/contracts/useMainContractActions'
import type { TableRow } from '@/types/table'
import { getContractPresentation } from '@/utils'
import BodApprovalModal from './BodApprovalModal.vue'
import ContractReadDataSection from './ContractReadDataSection.vue'
import PendingEventsList from './PendingEventsList.vue'
import TransferOwnershipForm from './forms/TransferOwnershipForm.vue'

const props = defineProps<{
  row: TableRow
  version?: string | null
}>()
const emit = defineEmits<{
  (event: 'contract-status-changed'): void
}>()
const toast = useToast()
const { copy } = useClipboard()
const showDetails = ref(false)
const presentation = computed(() => getContractPresentation(props.row.type))
const contractAddress = computed(() => props.row.address as Address)
const contractAbi = computed<Abi>(() => props.row.abi ?? [])

const {
  actionsDisabled,
  pendingActionsDisabled,
  isBodAction,
  formattedActions,
  modalWidth,
  showTransferModal,
  showApprovalModal,
  transferOwnershipErrorMessage,
  selectedRow,
  currentStep,
  isLoadingTransfer,
  isLoadingApproveAction,
  approveAction,
  openPendingActions,
  viewPendingAction,
  transferOwnership,
  changeContractStatus
} = useMainContractActions(toRef(props, 'row'), () => emit('contract-status-changed'))

function copyAddress() {
  void copy(props.row.address)
  toast.add({ title: 'Contract address copied', color: 'success', icon: 'i-lucide-check' })
}

function openInExplorer() {
  window.open(`${NETWORK.blockExplorerUrl}/address/${props.row.address}`, '_blank')
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'View contract details',
      icon: 'i-lucide-panel-right-open',
      onSelect: () => (showDetails.value = true)
    },
    { label: 'Copy contract address', icon: 'i-lucide-copy', onSelect: copyAddress },
    { label: 'Open in explorer', icon: 'i-lucide-external-link', onSelect: openInExplorer }
  ],
  [
    {
      label: formattedActions.value.length
        ? `Review pending actions (${formattedActions.value.length})`
        : 'No pending actions',
      icon: 'i-lucide-clock-3',
      disabled: pendingActionsDisabled.value,
      onSelect: openPendingActions
    },
    {
      label: 'Transfer ownership',
      icon: 'i-lucide-arrow-left-right',
      disabled: actionsDisabled.value,
      onSelect: () => (showTransferModal.value = true)
    },
    {
      label: props.row.paused ? 'Resume contract' : 'Pause contract',
      icon: props.row.paused ? 'i-lucide-play' : 'i-lucide-pause',
      color: props.row.paused ? 'success' : 'error',
      disabled: actionsDisabled.value,
      onSelect: () => changeContractStatus(props.row.paused)
    }
  ]
])
</script>
