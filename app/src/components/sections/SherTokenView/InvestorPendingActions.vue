<template>
  <ButtonUI
    :disabled="formatedActions.length === 0"
    variant="success"
    :outline="true"
    @click="showDetailsModal = true"
  >
    Pending Actions ({{ formatedActions.length }})
  </ButtonUI>
  <!-- Modal for listing pending actions -->
  <ModalComponent v-model="showDetailsModal" :modal-width="'w-1/2 max-w-4xl'">
    <PendingEventsList :pending-actions="formatedActions" @view-details="onViewDetails" />
  </ModalComponent>

  <!-- Modal for approving a specific action -->
  <ModalComponent v-model="showApproveModal" :modal-width="'w-1/3 max-w-4xl'">
    <BodApprovalModal
      v-if="selectedAction"
      :row="selectedAction"
      @approve-action="approveAction"
      :loading="isLoadingApproveAction"
    />
  </ModalComponent>
</template>

<script setup lang="ts">
import PendingEventsList from '@/components/sections/ContractManagementView/PendingEventsList.vue'

import ModalComponent from '@/components/ModalComponent.vue'
import BodApprovalModal from '@/components/sections/ContractManagementView/BodApprovalModal.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { computed, ref, watch } from 'vue'
import { useTeamStore, useToastStore } from '@/stores'
import { filterAndFormatActions, log, parseError } from '@/utils'
import { useTanstackQuery } from '@/composables'
import type { ActionResponse } from '@/types'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { encodeFunctionData, type Abi } from 'viem'
import BOD_ABI from '@/artifacts/abi/bod.json'
const { addSuccessToast, addErrorToast } = useToastStore()
import { estimateGas } from '@wagmi/core'
import { useCustomFetch } from '@/composables'
import { useQueryClient } from '@tanstack/vue-query'

import { config } from '@/wagmi.config'

const teamStore = useTeamStore()
const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const actionUrl = ref('')
const queryClient = useQueryClient()
const emits = defineEmits(['contract-status-changed'])

const { data: newActionData } = useTanstackQuery<ActionResponse>(
  'actionData',
  computed(() => `/actions?teamId=${teamStore.currentTeamId}&isExecuted=false`),
  {
    queryKey: ['actionData'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  }
)

const { /*error: errorUpdateAction,*/ execute: executeUpdateAction } = useCustomFetch(actionUrl, {
  immediate: false
}).patch()

const formatedActions = computed(() => {
  return filterAndFormatActions(
    bankAddress.value ?? '',
    newActionData.value,
    teamStore.currentTeam?.members || []
  )
})

const {
  data: hashApproveAction,
  writeContract: executeApproveAction,
  isPending: isLoadingApproveAction
  // error: errorApproveAction
} = useWriteContract()

const { isLoading: isConfirmingApproveAction, isSuccess: isConfirmedApproveAction } =
  useWaitForTransactionReceipt({
    hash: hashApproveAction
  })

watch(isConfirmingApproveAction, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedApproveAction.value) {
    await executeUpdateAction()
    await queryClient.invalidateQueries({
      queryKey: ['readContract']
    })
    showApproveModal.value = false
    addSuccessToast('Action approved successfully!')
    // emits('contract-status-changed')
  }
})
// Modal logic for viewing details
const showDetailsModal = ref(false)
const showApproveModal = ref(false)
const selectedAction = ref(null)

function onViewDetails(row: any) {
  selectedAction.value = row
  showApproveModal.value = true
  showDetailsModal.value = false
}

const approveAction = async (actionId: number, dbId: number) => {
  showApproveModal.value = false
  const bodAddress = teamStore.getContractAddressByType('BoardOfDirectors')

  if (!bodAddress) {
    console.log('BOD address not found, skipping approval.')
    return
  }

  try {
    const data = encodeFunctionData({
      abi: BOD_ABI,
      functionName: 'approve',
      args: [actionId]
    })
    await estimateGas(config, {
      to: bodAddress,
      data
    })

    executeApproveAction({
      address: bodAddress,
      abi: BOD_ABI,
      functionName: 'approve',
      args: [actionId]
    })
    actionUrl.value = `actions/${dbId}`
  } catch (error) {
    addErrorToast(parseError(error, BOD_ABI as Abi))
    try {
      addErrorToast(parseError(error, BOD_ABI as Abi))
    } catch (e) {
      addErrorToast('Unknown error')
    }
  }
}
</script>
