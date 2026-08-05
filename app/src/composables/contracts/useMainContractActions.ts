import { computed, ref, watch, type Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { encodeFunctionData, type Address } from 'viem'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useBodAddAction, useBodApproveAction } from '@/composables/bod/writes'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useGetBodActionsQuery } from '@/queries'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { TableRow } from '@/types/table'
import { classifyError, filterAndFormatActions, log } from '@/utils'

export function useMainContractActions(row: Ref<TableRow>, onStatusChanged: () => void) {
  const teamStore = useTeamStore()
  const userDataStore = useUserDataStore()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

  const showTransferModal = ref(false)
  const showApprovalModal = ref(false)
  const transferOwnershipErrorMessage = ref('')
  const selectedRow = ref<TableRow>({})
  const currentStep = ref<0 | 1 | 2>(0)

  const rowAddress = computed(() => row.value.address as Address)
  const { isBodAction } = useBodIsBodAction(rowAddress)
  const addAction = useBodAddAction()
  const approveAction = useBodApproveAction()

  const { data: bodActions } = useGetBodActionsQuery({
    queryParams: {
      teamId: computed(() => teamStore.currentTeamId),
      isExecuted: false
    }
  })

  const formattedActions = computed(() =>
    filterAndFormatActions(
      row.value.address,
      bodActions.value,
      teamStore.currentTeam?.members || []
    )
  )
  const canManage = computed(() => row.value.owner === userDataStore.address || isBodAction.value)
  const actionsDisabled = computed(() => isWriteDisabled.value || !canManage.value)
  const pendingActionsDisabled = computed(
    () => isWriteDisabled.value || !isBodAction.value || formattedActions.value.length === 0
  )
  const modalWidth = computed(() =>
    currentStep.value === 1 ? 'w-full sm:max-w-4xl' : 'w-full sm:max-w-xl'
  )

  const transferMutation = useContractWritesV3({
    contractAddress: rowAddress,
    abi: ownablePausableAbi,
    functionName: 'transferOwnership'
  })
  const pauseMutation = useContractWritesV3({
    contractAddress: rowAddress,
    abi: ownablePausableAbi,
    functionName: 'pause'
  })
  const unpauseMutation = useContractWritesV3({
    contractAddress: rowAddress,
    abi: ownablePausableAbi,
    functionName: 'unpause'
  })

  function openPendingActions() {
    showApprovalModal.value = true
    currentStep.value = 1
  }

  function viewPendingAction(action: TableRow) {
    selectedRow.value = action
    currentStep.value = 2
  }

  async function transferOwnership(address: Address) {
    if (isBodAction.value) {
      const data = encodeFunctionData({
        abi: row.value.abi,
        functionName: 'transferOwnership',
        args: [address]
      })
      const description = JSON.stringify({
        text: `Transfer ownership of ${row.value.type} to ${address}`,
        title: 'Ownership Transfer Request'
      })

      await addAction.executeAddAction({
        targetAddress: row.value.address,
        description,
        data
      })
      return
    }

    transferMutation.mutate(
      { args: [address] },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: ['readContract', { functionName: 'isMember' }],
            exact: false
          })
          void queryClient.invalidateQueries({
            queryKey: ['readContract', { functionName: 'owner' }],
            exact: false
          })
          showTransferModal.value = false
          transferOwnershipErrorMessage.value = ''
          toast.add({ title: 'Ownership transferred successfully!', color: 'success' })
          onStatusChanged()
        }
      }
    )
  }

  function changeContractStatus(paused: boolean) {
    const mutation = paused ? unpauseMutation : pauseMutation
    const successTitle = paused ? 'Contract resumed successfully!' : 'Contract paused successfully!'

    mutation.mutate(
      { args: [] },
      {
        onSuccess: () => {
          toast.add({ title: successTitle, color: 'success' })
          onStatusChanged()
        }
      }
    )
  }

  watch(addAction.isSuccess, (isAdded) => {
    if (isAdded) {
      showTransferModal.value = false
      onStatusChanged()
    }
  })

  watch(approveAction.isSuccess, (isApproved) => {
    if (isApproved) {
      showApprovalModal.value = false
      onStatusChanged()
    }
  })

  watch(transferMutation.error, (error) => {
    if (!error) return
    log.error('errorTransferOwnership.value: ', error)
    const classified = classifyError(error)
    if (classified.category !== 'user_rejected') {
      transferOwnershipErrorMessage.value = classified.userMessage
    }
  })

  const watchStatusError = (error: Ref<Error | null>, label: string) =>
    watch(error, (value) => {
      if (!value) return
      log.error(`${label}: `, value)
      const classified = classifyError(value)
      if (classified.category !== 'user_rejected') {
        toast.add({ title: classified.userMessage, color: 'error' })
      }
    })

  watchStatusError(pauseMutation.error, 'errorPauseContract.value')
  watchStatusError(unpauseMutation.error, 'errorUnpauseContract.value')

  return {
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
    isLoadingStatus: computed(
      () => pauseMutation.isPending.value || unpauseMutation.isPending.value
    ),
    isLoadingTransfer: computed(
      () => transferMutation.isPending.value || addAction.isPending.value
    ),
    isLoadingApproveAction: approveAction.isPending,
    approveAction: approveAction.executeApproveAction,
    openPendingActions,
    viewPendingAction,
    transferOwnership,
    changeContractStatus
  }
}
