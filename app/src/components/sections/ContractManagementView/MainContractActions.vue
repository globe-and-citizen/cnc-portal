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
      Pending Events (3)
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
        <BodApprovalModal v-if="showApprovalModal && currentStep === 2" :row="selectedRow" />
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
import { filterAndFormatActions, log, parseError, type FormattedAction } from '@/utils'
import PendingEventsList from './PendingEventsList.vue'
import BodApprovalModal from './BodApprovalModal.vue'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import BOD_ABI from '@/artifacts/abi/bod.json'
import { useCustomFetch } from '@/composables'
import type { Action, ActionResponse, User } from '@/types'
import { useTanstackQuery } from '@/composables'

const props = defineProps<{
  row: TableRow
}>()

const emits = defineEmits(['contract-status-changed'])

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const showModal = ref(false)
const showApprovalModal = ref(false)
const selectedRow = ref<TableRow>({})
const currentStep = ref<0 | 1 | 2>(0)
const modalWidth = computed(() => {
  return currentStep.value === 1 ? 'w-1/2 max-w-4xl' : ''
})
const isBodAction = ref(false)
const action = ref({})
const formatedActions = computed(() => {
  return filterAndFormatActions(
    props.row.address,
    newActionData.value,
    teamStore.currentTeam?.members || []
  )
})

const userDataStore = useUserDataStore()

const { data: newActionData } = useTanstackQuery<ActionResponse>(
  'actionData',
  computed(() => `/actions?teamId=${teamStore.currentTeamId}&isExecuted=false`),
  {
    queryKey: ['actionData'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  }
)

const { error: errorSaveAction, execute: executeSaveAction } = useCustomFetch('actions/', {
  immediate: false
}).post(action)

const {
  data: hashAddAction,
  writeContract: executeAddAction,
  isPending: isLoadingAddAction,
  error: errorAddAction
} = useWriteContract()

const { isLoading: isConfirmingAddAction, isSuccess: isConfirmedAddAction } =
  useWaitForTransactionReceipt({
    hash: hashAddAction
  })

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
    const actionId = await readContract(config, {
      address: bodAddress,
      abi: BOD_ABI,
      functionName: 'actionCount'
    })
    const data = encodeFunctionData({
      abi: props.row.abi as Abi,
      functionName: 'transferOwnership',
      args: [address]
    })
    const description = JSON.stringify({
      text: `Transfer ownership of ${props.row.type} to ${address}`,
      title: `Ownership Transfer Request`
    })
    executeAddAction({
      address: teamStore.getContractAddressByType('BoardOfDirectors') as Address,
      abi: BOD_ABI,
      functionName: 'addAction',
      args: [props.row.address, description, data]
    })
    action.value = {
      teamId: teamStore.currentTeamId,
      actionId: Number(actionId),
      targetAddress: props.row.address,
      description,
      data
    }
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

watch(newActionData, (data) => {
  if (data) {
    console.log('New action data: ', data.data)
  }
})

watch(isConfirmingAddAction, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedAddAction.value) {
    await executeSaveAction()
    addSuccessToast('Action added successfully!')
  }
})

watch(isConfirmingTransferOwnership, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedTransferOwnership.value) {
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

onMounted(async () => {
  const bodAddress = teamStore.getContractAddressByType('BoardOfDirectors')
  const isMember = await readContract(config, {
    address: bodAddress as Address,
    abi: BOD_ABI,
    functionName: 'isMember',
    args: [userDataStore.address]
  })
  isBodAction.value = props.row.owner === bodAddress && isMember ? true : false
})
</script>
