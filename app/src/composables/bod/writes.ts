import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { type Address } from 'viem'
import { readContract } from '@wagmi/core'
import { useTeamStore } from '@/stores'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { config } from '@/wagmi.config'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { log } from '@/utils'
import { useCreateActionMutation, useUpdateActionMutation } from '@/queries/action.queries'
import { useCreateBulkNotificationsMutation } from '@/queries/notification.queries'
import type { Action } from '@/types'
import { BOD_FUNCTION_NAMES } from './reads'

/**
 * Add a BOD action.
 *
 * The on-chain write is followed (in V3 `onSuccess`) by:
 *   1. creating the action in the backend DB,
 *   2. invalidating the `getBodActions` cache,
 *   3. notifying the other board members (best-effort).
 *
 * Consumers call `executeAddAction(partialAction)`; the wrapper reads
 * `actionCount` on-chain to build the action body before triggering the
 * mutation, and stashes that body in a closure ref for `onSuccess` to read.
 */
export function useBodAddAction() {
  const teamStore = useTeamStore()
  const toast = useToast()
  const queryClient = useQueryClient()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const createActionMutation = useCreateActionMutation()
  const { mutateAsync: addBulkNotifications } = useCreateBulkNotificationsMutation()

  const action = ref<Partial<Action> | null>(null)

  const mutation = useContractWritesV3({
    contractAddress: bodAddress,
    abi: BOD_ABI,
    functionName: BOD_FUNCTION_NAMES.ADD_ACTION,
    onSuccess: async () => {
      if (action.value) {
        await createActionMutation.mutateAsync({ body: action.value })
      }

      await queryClient.invalidateQueries({ queryKey: ['getBodActions'] })

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
        log.error('Error creating notifications:', err)
      }
    }
  })

  const executeAddAction = async (data: Partial<Action>) => {
    try {
      if (!bodAddress.value) {
        toast.add({ title: 'BOD address not found', color: 'error' })
        return
      }
      if (!teamStore.currentTeamId) {
        toast.add({ title: 'No current team ID found', color: 'error' })
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

      return await mutation.mutateAsync({
        args: [data.targetAddress, data.description, data.data] as readonly unknown[]
      })
    } catch (err) {
      console.error(err)
    }
  }

  return {
    ...mutation,
    executeAddAction
  }
}

/**
 * Approve a BOD action.
 *
 * After the on-chain approval confirms, `onSuccess` checks whether the action
 * has reached its execution threshold and, if so, marks it as executed in the
 * backend DB. It then invalidates the related read caches (`isMember`,
 * `owner`, `getBodActions`).
 */
export function useBodApproveAction() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const updateActionMutation = useUpdateActionMutation()

  const currentActionId = ref<bigint>(0n)
  const currentDbId = ref<number | undefined>(undefined)

  const mutation = useContractWritesV3({
    contractAddress: bodAddress,
    abi: BOD_ABI,
    functionName: BOD_FUNCTION_NAMES.APPROVE,
    onSuccess: async () => {
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
  })

  const executeApproveAction = async (actionId: number, dbId?: number) => {
    currentActionId.value = BigInt(actionId)
    currentDbId.value = dbId
    return mutation.mutateAsync({ args: [BigInt(actionId)] as readonly unknown[] })
  }

  return {
    ...mutation,
    executeApproveAction
  }
}
