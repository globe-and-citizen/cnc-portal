<template>
  <div class="flex items-center gap-2">
    <UButton
      :color="row.paused ? 'info' : 'error'"
      size="sm"
      @click="changeContractStatus(row.paused)"
      :loading="isLoadingPauseContract || isLoadingUnpauseContract"
      :disabled="row.owner !== userDataStore.address && !isBodAction"
    >
      <IconifyIcon
        v-if="!isLoadingPauseContract && !isLoadingUnpauseContract"
        :icon="`heroicons:${row.paused ? 'play' : 'pause-circle'}-solid`"
      />
    </UButton>
    <UButton
      color="success"
      variant="outline"
      size="sm"
      @click="showModal = true"
      :disabled="row.owner !== userDataStore.address && !isBodAction"
      label="Transfer Ownership"
    />
    <UButton
      :disabled="!isBodAction || formatedActions.length <= 0"
      color="success"
      variant="outline"
      size="sm"
      @click="
        () => {
          showApprovalModal = true
          currentStep = 1
        }
      "
      label="Pending Actions"
    />

    <UModal v-model:open="showModal">
      <template #body>
        <UAlert v-if="transferOwnershipErrorMessage" color="error" variant="soft" :description="transferOwnershipErrorMessage" class="mb-4" />
        <TransferOwnershipForm
          v-if="showModal"
          :is-bod-action="isBodAction"
          @transfer-ownership="transferOwnership"
          :loading="
            isLoadingTransferOwnership ||
            isConfirmingTransferOwnership ||
            isLoadingAddAction ||
            isConfirmingAddAction
          "
        />
      </template>
    </UModal>
    <UModal v-model:open="showApprovalModal" :ui="{ content: modalWidth }">
      <template #body>
        <PendingEventsList
          :pending-actions="formatedActions"
          @view-details="
            (row) => {
              selectedRow = row
              currentStep = 2
            }
          "
          v-if="showApprovalModal && currentStep === 1"
        />
        <BodApprovalModal
          v-if="showApprovalModal && currentStep === 2"
          :row="selectedRow"
          @approve-action="approveAction"
          :loading="isLoadingApproveAction"
          @close="showApprovalModal = false"
        />
      </template>
    </UModal>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import { encodeFunctionData, type Address } from 'viem'
import type { TableRow } from '@/components/TableComponent.vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { watch, ref, computed } from 'vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import TransferOwnershipForm from './forms/TransferOwnershipForm.vue'
import { filterAndFormatActions, log, parseError } from '@/utils'
import PendingEventsList from './PendingEventsList.vue'
import BodApprovalModal from './BodApprovalModal.vue'
import { useGetBodActionsQuery } from '@/queries'
import { useBodAddAction, useBodApproveAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useQueryClient } from '@tanstack/vue-query'

const props = defineProps<{
  row: TableRow
}>()

const emits = defineEmits(['contract-status-changed'])

const teamStore = useTeamStore()
const toast = useToast()
const userDataStore = useUserDataStore()
const queryClient = useQueryClient()

// BOD action composables
const addActionComposable = useBodAddAction()
const approveActionComposable = useBodApproveAction()

const { isBodAction } = useBodIsBodAction(props.row.address as Address)

// Destructure addAction properties
const {
  executeAddAction,
  isPending: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = addActionComposable

// Destructure approveAction properties
const { executeApproveAction, isLoadingApproveAction, isActionApproved } = approveActionComposable

// Create wrapper functions for template usage
const addAction = executeAddAction
const approveAction = executeApproveAction

const showModal = ref(false)
const showApprovalModal = ref(false)
const transferOwnershipErrorMessage = ref('')
const selectedRow = ref<TableRow>({})
const currentStep = ref<0 | 1 | 2>(0)

const { data: bodActions } = useGetBodActionsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    isExecuted: false
  }
})

const modalWidth = computed(() => {
  return currentStep.value === 1 ? 'w-1/2 max-w-4xl' : 'w-1/3 max-w-4xl'
})
const formatedActions = computed(() => {
  return filterAndFormatActions(
    props.row.address,
    bodActions.value,
    teamStore.currentTeam?.members || []
  )
})

const {
  data: hashTransferOwnership,
  mutate: executeTransferOwnership,
  isPending: isLoadingTransferOwnership,
  error: errorTransferOwnership
} = useWriteContract()

const { isLoading: isConfirmingTransferOwnership, isSuccess: isConfirmedTransferOwnership } =
  useWaitForTransactionReceipt({
    hash: hashTransferOwnership
  })

const {
  data: hashPauseContract,
  mutate: executePauseContract,
  isPending: isLoadingPauseContract,
  error: errorPauseContract
} = useWriteContract()

const { isLoading: isConfirmingPauseContract, isSuccess: isConfirmedPauseContract } =
  useWaitForTransactionReceipt({
    hash: hashPauseContract
  })

const {
  data: hashUnpauseContract,
  mutate: executeUnpauseContract,
  isPending: isLoadingUnpauseContract,
  error: errorUnpauseContract
} = useWriteContract()

const { isLoading: isConfirmingUnpauseContract, isSuccess: isConfirmedUnpauseContract } =
  useWaitForTransactionReceipt({
    hash: hashUnpauseContract
  })

const transferOwnership = async (address: Address) => {
  if (isBodAction.value) {
    const data = encodeFunctionData({
      abi: props.row.abi,
      functionName: 'transferOwnership',
      args: [address]
    })
    const description = JSON.stringify({
      text: `Transfer ownership of ${props.row.type} to ${address}`,
      title: `Ownership Transfer Request`
    })

    await addAction({
      targetAddress: props.row.address,
      description,
      data
    })
  } else
    executeTransferOwnership({
      address: props.row.address as Address,
      abi: props.row.abi,
      functionName: 'transferOwnership',
      args: [address]
    })
}

const changeContractStatus = async (paused: boolean) => {
  if (paused) {
    executeUnpauseContract({
      address: props.row.address as Address,
      abi: props.row.abi,
      functionName: 'unpause' as const,
      args: []
    })
  } else {
    executePauseContract({
      address: props.row.address as Address,
      abi: props.row.abi,
      functionName: 'pause' as const,
      args: []
    })
  }
}

watch(isActionAdded, (isAdded) => {
  if (isAdded) {
    showModal.value = false
    emits('contract-status-changed')
  }
})

watch(isActionApproved, (isApproved) => {
  if (isApproved) {
    showApprovalModal.value = false
    emits('contract-status-changed')
  }
})

watch(isConfirmingTransferOwnership, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedTransferOwnership.value) {
    queryClient.invalidateQueries({
      queryKey: ['readContract', { functionName: 'isMember' }],
      exact: false
    })
    queryClient.invalidateQueries({
      queryKey: ['readContract', { functionName: 'owner' }],
      exact: false
    })
    showModal.value = false
    transferOwnershipErrorMessage.value = ''
    toast.add({ title: 'Ownership transferred successfully!', color: 'success' })
    emits('contract-status-changed')
  }
})

watch(isConfirmingPauseContract, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedPauseContract.value) {
    toast.add({ title: 'Contract paused successfully!', color: 'success' })
    emits('contract-status-changed')
  }
})

watch(isConfirmingUnpauseContract, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedUnpauseContract.value) {
    toast.add({ title: 'Contract paused successfully!', color: 'success' })
    emits('contract-status-changed')
  }
})

watch(errorTransferOwnership, (error) => {
  if (error) {
    transferOwnershipErrorMessage.value = parseError(error, props.row.abi)
    log.error('errorTransferOwnership.value: ', error)
  }
})

watch(errorPauseContract, (error) => {
  if (error) {
    toast.add({ title: parseError(error, props.row.abi), color: 'error' })
    log.error('errorPauseContract.value: ', error)
  }
})

watch(errorUnpauseContract, (error) => {
  if (error) {
    toast.add({ title: parseError(error, props.row.abi), color: 'error' })
    log.error('errorUnpauseContract.value: ', error)
  }
})
</script>
