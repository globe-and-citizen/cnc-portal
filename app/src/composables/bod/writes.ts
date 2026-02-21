import { computed, ref, watch, unref, type MaybeRef } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { encodeFunctionData, type Address } from 'viem'
import { estimateGas, readContract, writeContract } from '@wagmi/core'
import { useTeamStore, useToastStore } from '@/stores'
import { useContractWrites } from '../contracts/useContractWritesV2'
import { config } from '@/wagmi.config'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { log, parseError } from '@/utils'
import { useCreateActionMutation, useUpdateActionMutation } from '@/queries/action.queries'
import { useCreateBulkNotificationsMutation } from '@/queries/notification.queries'
import type { Action } from '@/types'
import { BOD_FUNCTION_NAMES, type BodFunctionName } from './reads'

/**
 * Helper function to create a BOD contract write
 */
function useBodContractWrite(options: {
  functionName: BodFunctionName
  args?: MaybeRef<readonly unknown[]>
}) {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  return useContractWrites({
    contractAddress: bodAddress,
    abi: BOD_ABI,
    functionName: options.functionName,
    args: options.args ?? []
  })
}

/**
 * Pause the BOD contract
 */
export function useBodPause() {
  return useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.PAUSE
  })
}

/**
 * Unpause the BOD contract
 */
export function useBodUnpause() {
  return useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.UNPAUSE
  })
}

/**
 * Set board of directors
 */
export function useBodSetBoardOfDirectors(addresses: MaybeRef<Address[]>) {
  const addressesValue = computed(() => unref(addresses))

  return useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.SET_BOARD_OF_DIRECTORS,
    args: addressesValue
  })
}

/**
 * Add a BOD action
 */
export function useBodAddAction(actionData: MaybeRef<Partial<Action> | null>) {
  const teamStore = useTeamStore()
  const { addErrorToast } = useToastStore()
  const queryClient = useQueryClient()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const createActionMutation = useCreateActionMutation()
  const { mutateAsync: addBulkNotifications } = useCreateBulkNotificationsMutation()

  const action = ref<Partial<Action> | null>(null)
  const isActionAdded = ref(false)

  const actionDataValue = computed(() => unref(actionData))

  // Prepare arguments for the contract call
  const args = computed(() => {
    if (!actionDataValue.value) return []
    return [
      actionDataValue.value.targetAddress,
      actionDataValue.value.description,
      actionDataValue.value.data
    ]
  })

  const writeResult = useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.ADD_ACTION,
    args
  })

  const { isConfirmed, isConfirming } = writeResult

  // Watch for confirmation and create notifications
  watch(isConfirming, async (newStatus, oldStatus) => {
    if (oldStatus && !newStatus && isConfirmed.value) {
      if (action.value) {
        await createActionMutation.mutateAsync({ body: action.value })
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
            body: {
              userIds: recipients,
              message: 'New board action requires your approval',
              subject: 'New Board Action Created',
              author: action.value.userAddress ?? '',
              resource: `teams/${teamStore.currentTeamId}/contract-management`
            }
          })
        }
      } catch (err) {
        console.error('Error in notification process:', err)
        log.error('Error creating notifications:', err)
      }
    }
  })

  const executeAddAction = async (data: Partial<Action>) => {
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

      const actionId = (await readContract(config, {
        address: bodAddress.value,
        functionName: 'actionCount',
        abi: BOD_ABI
      })) as bigint

      action.value = {
        teamId: Number(teamStore.currentTeamId),
        actionId: Number(actionId),
        ...data
      }

      // Execute the write
      return writeResult.writeContract({
        args: [data.targetAddress, data.description, data.data] as readonly unknown[]
      })
    } catch (err) {
      console.error(err)
    }
  }

  return {
    ...writeResult,
    executeAddAction,
    isActionAdded
  }
}

/**
 * Approve a BOD action
 */
export function useBodApproveAction(actionId: MaybeRef<number>) {
  const teamStore = useTeamStore()
  const { addErrorToast, addSuccessToast } = useToastStore()
  const queryClient = useQueryClient()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const updateActionMutation = useUpdateActionMutation()

  const isLoadingApproveAction = ref(false)
  const isActionApproved = ref(false)

  const actionIdValue = computed(() => unref(actionId))

  // Prepare arguments for the contract call
  const args = computed(() => {
    return [BigInt(actionIdValue.value)] as const
  })

  const writeResult = useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.APPROVE,
    args
  })

  const executeApproveAction = async (dbId: number) => {
    isActionApproved.value = false
    isLoadingApproveAction.value = true

    if (!bodAddress.value) {
      return
    }

    try {
      const data = encodeFunctionData({
        abi: BOD_ABI,
        functionName: 'approve',
        args: [BigInt(actionIdValue.value)]
      })

      await estimateGas(config, {
        to: bodAddress.value,
        data
      })

      await writeContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'approve',
        args: [BigInt(actionIdValue.value)]
      })

      const isActionExecuted = await readContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'isActionExecuted',
        args: [BigInt(actionIdValue.value)]
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
      isActionApproved.value = true
    } catch (error) {
      log.error('Error approving action: ', parseError(error, BOD_ABI))
      addErrorToast(parseError(error, BOD_ABI))
    } finally {
      isLoadingApproveAction.value = false
    }
  }

  return {
    ...writeResult,
    executeApproveAction,
    isLoadingApproveAction,
    isActionApproved
  }
}
