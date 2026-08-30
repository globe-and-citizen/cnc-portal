<template>
  <template v-if="row">
    <USlideover
      :open="isDetailsOpen"
      title="Contract details"
      description="Technical identifiers and current on-chain state."
      :ui="{ content: 'w-full sm:max-w-xl' }"
      @update:open="updateOpen($event ? 'details' : null)"
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
              <dd class="mt-2"><AddressTooltip :address="row.address" :slice="true" /></dd>
            </div>
            <div class="py-4">
              <dt class="text-muted">Owner</dt>
              <dd class="mt-2">
                <AddressTooltip v-if="row.owner" :address="row.owner" :slice="true" />
                <span v-else class="text-muted">Not available</span>
              </dd>
            </div>
            <div class="py-4">
              <dt class="text-muted">Deployer</dt>
              <dd class="mt-2">
                <AddressTooltip v-if="row.deployer" :address="row.deployer" :slice="true" />
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
            :enabled="isDetailsOpen"
          />
        </div>
      </template>
    </USlideover>

    <UModal
      :open="isTransferOpen"
      title="Transfer Ownership"
      description="Transfer contract ownership to a Board of Directors member or an individual team member."
      @update:open="updateOpen($event ? 'transfer' : null)"
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
          v-if="isTransferOpen"
          :is-bod-action="isBodAction"
          :loading="isLoadingTransfer"
          @transfer-ownership="transferOwnership"
        />
      </template>
    </UModal>

    <UModal
      :open="isApprovalOpen"
      :ui="{ content: modalWidth }"
      title="Review Pending Actions"
      description="Approve or reject pending board actions before execution."
      @update:open="updateOpen($event ? 'approval' : null)"
    >
      <template #body>
        <PendingEventsList
          v-if="isApprovalOpen && currentStep === 1"
          :pending-actions="pendingActions"
          @view-details="viewPendingAction"
        />
        <BodApprovalContent
          v-if="isApprovalOpen && currentStep === 2"
          :row="selectedAction"
          :loading="isLoadingApproveAction"
          @approve-action="approveAction"
          @close="updateOpen(null)"
        />
      </template>
    </UModal>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import type { Abi, Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { useBodApproveAction } from '@/composables/bod/writes'
import { useContractOwnershipTransfer } from '@/composables/contracts/useContractOwnershipTransfer'
import { useContractStatusChange } from '@/composables/contracts/useContractStatusChange'
import type { TableRow } from '@/types/table'
import type { FormattedAction } from '@/utils'
import { getContractPresentation } from '@/utils'
import BodApprovalContent from './BodApprovalContent.vue'
import ContractReadDataSection from './ContractReadDataSection.vue'
import PendingEventsList from './PendingEventsList.vue'
import TransferOwnershipForm from './forms/TransferOwnershipForm.vue'

type ContractActionSurface = 'details' | 'transfer' | 'approval' | null

interface ContractStatusChangeRequest {
  id: number
  paused: boolean
}

interface Props {
  row: TableRow | null
  version?: string | null
  pendingActions: FormattedAction
  isBodAction: boolean
  open: ContractActionSurface
  statusChangeRequest: ContractStatusChangeRequest | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [surface: ContractActionSurface]
  'contract-status-changed': []
}>()

const approveActionMutation = useBodApproveAction()
const selectedAction = ref<TableRow>({})
const currentStep = ref<0 | 1 | 2>(0)
const handledStatusChangeRequest = ref<number | null>(null)
const rowRef = computed<TableRow>(() => props.row ?? {})
const isBodActionRef = toRef(props, 'isBodAction')
const presentation = computed(() => getContractPresentation(props.row?.type ?? ''))
const contractAddress = computed(() => props.row?.address as Address)
const contractAbi = computed<Abi>(() => props.row?.abi ?? [])
const isDetailsOpen = computed(() => props.open === 'details')
const isTransferOpen = computed(() => props.open === 'transfer')
const isApprovalOpen = computed(() => props.open === 'approval')
const modalWidth = computed(() =>
  currentStep.value === 1 ? 'w-full sm:max-w-4xl' : 'w-full sm:max-w-xl'
)
const isLoadingApproveAction = approveActionMutation.isPending
const approveAction = approveActionMutation.executeApproveAction
const {
  errorMessage: transferOwnershipErrorMessage,
  isLoading: isLoadingTransfer,
  transferOwnership
} = useContractOwnershipTransfer(rowRef, isBodActionRef, handleOwnershipTransferred)
const { changeContractStatus } = useContractStatusChange(
  contractAddress,
  handleContractStatusChanged
)

watch(
  () => props.open,
  (surface) => {
    if (surface === 'approval') currentStep.value = 1
  },
  { immediate: true }
)

watch(approveActionMutation.isSuccess, (isApproved) => {
  if (isApproved) handleApprovalComplete()
})

watch(
  [() => props.row?.address, () => props.statusChangeRequest],
  ([address, request]) => {
    if (!address || !request || request.id === handledStatusChangeRequest.value) return

    handledStatusChangeRequest.value = request.id
    changeContractStatus(request.paused)
  },
  { immediate: true }
)

function handleContractStatusChanged() {
  emit('contract-status-changed')
}

function handleOwnershipTransferred() {
  updateOpen(null)
  handleContractStatusChanged()
}

function handleApprovalComplete() {
  updateOpen(null)
  handleContractStatusChanged()
}

function viewPendingAction(action: TableRow) {
  selectedAction.value = action
  currentStep.value = 2
}

function updateOpen(surface: ContractActionSurface) {
  emit('update:open', surface)
}
</script>
