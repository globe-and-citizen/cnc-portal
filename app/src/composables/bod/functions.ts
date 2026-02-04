import { encodeFunctionData, type Address } from 'viem'
import { useToastStore, useTeamStore } from '@/stores'
import { useBodWrites } from './writes'
import { BOD_FUNCTION_NAMES } from './types'
import { useValidation } from '@/composables/bank'
import type { Action } from '@/types'
import { computed, ref, watch } from 'vue'
import { estimateGas, readContract, writeContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { useQueryClient } from '@tanstack/vue-query'
import { log, parseError } from '@/utils'
import { useCreateActionMutation, useUpdateActionMutation } from '@/queries/action.queries'
import { useCreateBulkNotificationsMutation } from '@/queries/notification.queries'
/**
 * BOD contract write functions - combines admin and transfers
 */
export function useBodWritesFunctions() {
  const writes = useBodWrites()
  const { validateAddress } = useValidation()
  const teamStore = useTeamStore()
  const { addErrorToast, addSuccessToast } = useToastStore()
  const queryClient = useQueryClient()
  const action = ref<Partial<Action> | null>(null)
  const isLoadingApproveAction = ref(false)
  const isActionAdded = ref(false)
  const isActionApproved = ref(false)
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isLoadingBankAction = computed(() => writes.isLoading)

  const createActionMutation = useCreateActionMutation()
  const updateActionMutation = useUpdateActionMutation()
  const { mutateAsync: addBulkNotifications } = useCreateBulkNotificationsMutation()

  const { isConfirmed, isConfirming } = writes

  watch(isConfirming, async (newStatus, oldStatus) => {
    if (oldStatus && !newStatus && isConfirmed.value) {
      if (action.value) {
        await createActionMutation.mutateAsync(action.value)
      }
      isActionAdded.value = true
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })

      try {
        const members = bodAddress.value
          ? ((await readContract(config, {
              address: bodAddress.value,
              abi: BOD_ABI,
              functionName: 'getBoardOfDirectors'
            })) as Address[])
          : []

        if (members.length > 0 && action.value) {
          const recipients = members.filter(
            (m) => m?.toLowerCase() !== (action.value?.userAddress || '').toLowerCase()
          )
          await addBulkNotifications({
            userIds: recipients,
            message: 'New board action requires your approval',
            subject: 'New Board Action Created',
            author: action.value.userAddress ?? '',
            resource: `teams/${teamStore.currentTeamId}/contract-management`
          })
        }
      } catch (err) {
        console.error('Error in notification process:', err)
        log.error('Error creating notifications:', err)
      }
    }
  })

  // Admin functions
  const pauseContract = () => writes.executeWrite(BOD_FUNCTION_NAMES.PAUSE)
  const unpauseContract = () => writes.executeWrite(BOD_FUNCTION_NAMES.UNPAUSE)

  const setBoardOfDirectors = (addresses: Address[]) => {
    for (const address of addresses)
      if (!validateAddress(address, 'board of directors address')) return

    return writes.executeWrite(BOD_FUNCTION_NAMES.SET_BOARD_OF_DIRECTORS, [addresses])
  }

  const addAction = async (actionData: Partial<Action>) => {
    isActionAdded.value = false
    try {
      if (!bodAddress.value) {
        addErrorToast('BOD address not found')
        return
      }
      if (!teamStore.currentTeamId) {
        addErrorToast('No current team ID found')
        return
      }
      // loadingContract.value = true
      const actionId = (await readContract(config, {
        address: bodAddress.value,
        functionName: 'actionCount',
        abi: BOD_ABI
      })) as bigint

      action.value = {
        teamId: Number(teamStore.currentTeamId),
        actionId: Number(actionId),
        ...actionData
      }

      return writes.executeWrite(BOD_FUNCTION_NAMES.ADD_ACTION, [
        actionData.targetAddress,
        actionData.description,
        actionData.data
      ])
    } catch (err) {
      console.error(err)
    } finally {
      // loadingContract.value = false
    }
  }

  const approveAction = async (_actionId: number, dbId: number) => {
    isActionApproved.value = false
    isLoadingApproveAction.value = true

    if (!bodAddress.value) {
      return
    }
    try {
      const data = encodeFunctionData({
        abi: BOD_ABI,
        functionName: 'approve',
        args: [BigInt(_actionId)]
      })
      await estimateGas(config, {
        to: bodAddress.value,
        data
      })
      await writeContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'approve',
        args: [BigInt(_actionId)]
      })
      const isActionExecuted = await readContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'isActionExecuted',
        args: [BigInt(_actionId)]
      })
      if (isActionExecuted) {
        await updateActionMutation.mutateAsync({ pathParams: { id: dbId } })
      }
      queryClient.invalidateQueries({
        queryKey: ['readContract', { functionName: 'isMember' }],
        exact: false
      })
      queryClient.invalidateQueries({
        queryKey: ['readContract', { functionName: 'owner' }],
        exact: false
      })
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
      addSuccessToast('Action approved successfully!')
      // isLoadingApproveAction.value = false
      isActionApproved.value = true
    } catch (error) {
      log.error('Error approving action: ', parseError(error, BOD_ABI))
      addErrorToast(parseError(error, BOD_ABI))
    } finally {
      isLoadingApproveAction.value = false
    }
  }

  return {
    // Write state
    ...writes,
    // Admin functions
    pauseContract,
    unpauseContract,
    // BOD functions
    setBoardOfDirectors,
    addAction,
    approveAction,
    // Reactive properties
    isLoadingApproveAction,
    isActionApproved,
    isActionAdded,
    isLoadingBankAction
  }
}
