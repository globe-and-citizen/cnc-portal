<template>
  <div class="flex items-center gap-2">
    <ButtonUI
      :variant="row.paused ? 'info' : 'error'"
      size="sm"
      @click="changeContractStatus(row.paused)"
      :loading="isLoadingPauseContract || isLoadingUnpauseContract"
      :disabled="row.owner !== userDataStore.address && !isBodAction"
    >
      <IconifyIcon
        v-if="!isLoadingPauseContract && !isLoadingUnpauseContract"
        :icon="`heroicons:${row.paused ? 'play' : 'pause-circle'}-solid`"
      />
    </ButtonUI>
    <ButtonUI
      variant="success"
      :outline="true"
      size="sm"
      @click="showModal = true"
      :disabled="row.owner !== userDataStore.address && !isBodAction"
      >Transfer Ownership</ButtonUI
    >
    <ButtonUI
      :disabled="!isBodAction || formatedActions.length <= 0"
      variant="success"
      :outline="true"
      size="sm"
      @click="
        () => {
          showApprovalModal = true
          currentStep = 1
        }
      "
    >
      Pending Actions ({{ formatedActions.length }})
    </ButtonUI>

    <teleport to="body">
      <ModalComponent v-model="showModal">
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
      </ModalComponent>
      <ModalComponent v-model="showApprovalModal" :modal-width="modalWidth">
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
          :loading="isLoadingApproveAction /*|| isConfirmingApproveAction*/"
        />
      </ModalComponent>
    </teleport>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { encodeFunctionData, type Abi, type Address } from 'viem'
import type { TableRow } from '@/components/TableComponent.vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { watch, ref, computed, onMounted } from 'vue'
import { useToastStore, useTeamStore, useUserDataStore } from '@/stores'
import TransferOwnershipForm from './forms/TransferOwnershipForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { filterAndFormatActions, log, parseError } from '@/utils'
import PendingEventsList from './PendingEventsList.vue'
import BodApprovalModal from './BodApprovalModal.vue'
import type { ActionResponse } from '@/types'
import { useTanstackQuery, useBod } from '@/composables'
import { useBodContract } from '@/composables/bod/'

const props = defineProps<{
  row: TableRow
}>()

const emits = defineEmits(['contract-status-changed'])

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const userDataStore = useUserDataStore()
// const {
//   addAction,
//   approveAction,
//   isActionAdded,
//   isActionApproved,
//   isLoadingAddAction,
//   isLoadingApproveAction,
//   isBodAction,
//   isConfirmingAddAction
// } = useBod(props.row.type, props.row.abi)

const {
  addAction,
  approveAction,
  useBodIsBodAction,
  isLoading: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded,
  isActionApproved,
  boardOfDirectors,
  isLoadingApproveAction
  // isConfirmingAddAction
} = useBodContract()
const { isBodAction } = useBodIsBodAction(props.row.address as Address, props.row.abi as Abi)

const showModal = ref(false)
const showApprovalModal = ref(false)
const selectedRow = ref<TableRow>({})
const currentStep = ref<0 | 1 | 2>(0)

const modalWidth = computed(() => {
  return currentStep.value === 1 ? 'w-1/2 max-w-4xl' : 'w-1/3 max-w-4xl'
})
const formatedActions = computed(() => {
  return filterAndFormatActions(
    props.row.address,
    newActionData.value,
    teamStore.currentTeam?.members || []
  )
})

const { data: newActionData } = useTanstackQuery<ActionResponse>(
  'actionData',
  computed(() => `/actions?teamId=${teamStore.currentTeamId}&isExecuted=false`),
  {
    queryKey: ['actionData'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  }
)

const {
  data: hashTransferOwnership,
  writeContract: executeTransferOwnership,
  isPending: isLoadingTransferOwnership,
  error: errorTransferOwnership
} = useWriteContract()

const { isLoading: isConfirmingTransferOwnership, isSuccess: isConfirmedTransferOwnership } =
  useWaitForTransactionReceipt({
    hash: hashTransferOwnership
  })

const {
  data: hashPauseContract,
  writeContract: executePauseContract,
  isPending: isLoadingPauseContract,
  error: errorPauseContract
} = useWriteContract()

const { isLoading: isConfirmingPauseContract, isSuccess: isConfirmedPauseContract } =
  useWaitForTransactionReceipt({
    hash: hashPauseContract
  })

const {
  data: hashUnpauseContract,
  writeContract: executeUnpauseContract,
  isPending: isLoadingUnpauseContract,
  error: errorUnpauseContract
} = useWriteContract()

const { isLoading: isConfirmingUnpauseContract, isSuccess: isConfirmedUnpauseContract } =
  useWaitForTransactionReceipt({
    hash: hashUnpauseContract
  })

const transferOwnership = async (address: Address) => {
  if (isBodAction.value) {
    const bodAddress = teamStore.getContractAddressByType('BoardOfDirectors')
    if (!bodAddress) return

    const data = encodeFunctionData({
      abi: props.row.abi as Abi,
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
      abi: props.row.abi as Abi,
      functionName: 'transferOwnership',
      args: [address]
    })
}

const changeContractStatus = async (paused: boolean) => {
  if (paused) {
    executeUnpauseContract({
      address: props.row.address as Address,
      abi: props.row.abi as Abi,
      functionName: 'unpause'
    })
  } else {
    executePauseContract({
      address: props.row.address as Address,
      abi: props.row.abi as Abi,
      functionName: 'pause'
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
    showModal.value = false
    addSuccessToast('Ownership transferred successfully!')
    emits('contract-status-changed')
  }
})

watch(isConfirmingPauseContract, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedPauseContract.value) {
    addSuccessToast('Contract paused successfully!')
    emits('contract-status-changed')
  }
})

watch(isConfirmingUnpauseContract, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedUnpauseContract.value) {
    addSuccessToast('Contract paused successfully!')
    emits('contract-status-changed')
  }
})

watch(errorTransferOwnership, (error) => {
  if (error) {
    addErrorToast(parseError(error, props.row.abi as Abi))
    log.error('errorTransferOwnership.value: ', error)
  }
})

watch(errorPauseContract, (error) => {
  if (error) {
    addErrorToast(parseError(error, props.row.abi as Abi))
    log.error('errorPauseContract.value: ', error)
  }
})

watch(errorUnpauseContract, (error) => {
  if (error) {
    addErrorToast(parseError(error, props.row.abi as Abi))
    log.error('errorUnpauseContract.value: ', error)
  }
})
</script>
