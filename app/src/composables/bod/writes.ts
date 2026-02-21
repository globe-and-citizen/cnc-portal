import { computed, ref, unref, type MaybeRef } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { type Address } from 'viem'
import { readContract } from '@wagmi/core'
import { useTeamStore, useToastStore } from '@/stores'
import { useContractWrites } from '../contracts/useContractWritesV2'
import { config } from '@/wagmi.config'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { log } from '@/utils'
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
export function useBodAddAction() {
  const teamStore = useTeamStore()
  const { addErrorToast } = useToastStore()
  const queryClient = useQueryClient()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const createActionMutation = useCreateActionMutation()
  const { mutateAsync: addBulkNotifications } = useCreateBulkNotificationsMutation()

  const action = ref<Partial<Action> | null>(null)

  // Prepare dynamic arguments - will be set when executing
  const args = ref<readonly unknown[]>([])

  const writeResult = useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.ADD_ACTION,
    args
  })

  // Override invalidateQueries to handle post-action logic
  const originalInvalidateQueries = writeResult.invalidateQueries
  writeResult.invalidateQueries = async () => {
    await originalInvalidateQueries()

    // Create action in database
    if (action.value) {
      await createActionMutation.mutateAsync({ body: action.value })
    }

    // Invalidate action queries
    await queryClient.invalidateQueries({ queryKey: ['getBodActions'] })

    // Send notifications to board members
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

  const executeAddAction = async (data: Partial<Action>) => {
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

      // Execute the write using executeWrite
      return writeResult.executeWrite(
        [data.targetAddress, data.description, data.data] as readonly unknown[]
      )
    } catch (err) {
      console.error(err)
    }
  }

  return {
    ...writeResult,
    executeAddAction,
    // Expose commonly used states for backward compatibility
    isPending: writeResult.writeResult.isPending,
    isConfirming: writeResult.receiptResult.isLoading,
    isActionAdded: writeResult.receiptResult.isSuccess
  }
}

/**
 * Approve a BOD action
 * Returns a composable that can approve multiple actions with different IDs
 */
export function useBodApproveAction() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const updateActionMutation = useUpdateActionMutation()

  // Dynamic refs that will be set when executeApproveAction is called
  const currentActionId = ref<bigint>(0n)
  const currentDbId = ref<number | undefined>(undefined)

  const args = computed(() => [currentActionId.value] as const)

  const writeResult = useBodContractWrite({
    functionName: BOD_FUNCTION_NAMES.APPROVE,
    args
  })

  // Override invalidateQueries to handle post-approval logic
  const originalInvalidateQueries = writeResult.invalidateQueries
  writeResult.invalidateQueries = async () => {
    await originalInvalidateQueries()

    // Check if action was executed and update database
    if (bodAddress.value && currentDbId.value) {
      try {
        const isActionExecuted = await readContract(config, {
          address: bodAddress.value,
          abi: BOD_ABI,
          functionName: 'isActionExecuted',
          args: [currentActionId.value]
        })

        if (isActionExecuted) {
          await updateActionMutation.mutateAsync({ pathParams: { id: currentDbId.value } })
        }
      } catch (error) {
        log.error('Error checking action execution status:', error)
      }
    }

    // Invalidate all relevant queries
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['readContract', { functionName: 'isMember' }],
        exact: false
      }),
      queryClient.invalidateQueries({
        queryKey: ['readContract', { functionName: 'owner' }],
        exact: false
      }),
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
    ])
  }

  // Execute approve action with dynamic actionId and dbId
  const executeApproveAction = async (actionId: number, dbId?: number) => {
    currentActionId.value = BigInt(actionId)
    currentDbId.value = dbId
    return writeResult.executeWrite([BigInt(actionId)] as readonly unknown[])
  }

  return {
    ...writeResult,
    executeApproveAction,
    // Expose commonly used states for backward compatibility
    isLoadingApproveAction: writeResult.writeResult.isPending,
    isActionApproved: writeResult.receiptResult.isSuccess
  }
}
