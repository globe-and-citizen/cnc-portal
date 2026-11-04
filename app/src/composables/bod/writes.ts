import { computed, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { type Address } from 'viem'
import { readContract } from '@wagmi/core'
import { useTeamStore } from '@/stores'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { config } from '@/wagmi.config'
import { boardOfDirectorsAbi } from '@/artifacts/abi/generated'
import { log } from '@/lib/logging'
import { useCreateActionMutation, useUpdateActionMutation } from '@/queries/action.queries'
import { useCreateBulkNotificationsMutation } from '@/queries/notification.queries'
import type { Action } from '@/types'

/** The fields `BoardOfDirectors.addAction` encodes, plus any extra Action metadata. */
type AddActionInput = Pick<Action, 'targetAddress' | 'description' | 'data'> & Partial<Action>
import { BOD_FUNCTION_NAMES } from './reads'

/** Owns preparation, confirmation and required registration as one mutation. */
export function useBodAddAction() {
  const teamStore = useTeamStore()
  const createActionMutation = useCreateActionMutation()
  const { mutateAsync: addBulkNotifications } = useCreateBulkNotificationsMutation()
  // This is an operation target, not a copy of server state. Keep it pinned until
  // registration finishes so a team switch cannot redirect an in-flight write.
  const writeAddress = ref<Address>()
  const write = useContractWritesV3({
    contractAddress: writeAddress,
    abi: boardOfDirectorsAbi,
    functionName: BOD_FUNCTION_NAMES.ADD_ACTION
  })

  const mutation = useMutation({
    // Retrying the whole workflow could duplicate a confirmed on-chain action.
    retry: false,
    mutationFn: async (data: AddActionInput) => {
      if (writeAddress.value) throw new Error('A Board action is already being submitted')
      const address = teamStore.getContractAddressByType('BoardOfDirectors')
      const teamId = teamStore.currentTeamId
      if (!address) throw new Error('BOD address not found')
      if (!teamId) throw new Error('No current team ID found')

      writeAddress.value = address
      try {
        const actionId = await readContract(config, {
          address,
          functionName: 'getActionCount',
          abi: boardOfDirectorsAbi
        })
        const action = { ...data, teamId: Number(teamId), actionId: Number(actionId) }
        const result = await write.mutateAsync({
          args: [data.targetAddress, data.description, data.data]
        })

        try {
          await createActionMutation.mutateAsync({ body: action })
        } catch (cause) {
          throw Object.assign(
            new Error(
              'The Board action was confirmed, but its record could not be saved. Refresh Contract Management before submitting again.'
            ),
            { cause }
          )
        }

        try {
          const members = await readContract(config, {
            address,
            abi: boardOfDirectorsAbi,
            functionName: 'getBoardOfDirectors'
          })
          const recipients = members.filter(
            (member) => member.toLowerCase() !== (action.userAddress ?? '').toLowerCase()
          )
          if (recipients.length) {
            await addBulkNotifications({
              body: {
                userIds: recipients,
                message: 'New board action requires your approval',
                subject: 'New Board Action Created',
                author: action.userAddress ?? '',
                resource: `teams/${teamId}/contract-management`
              }
            })
          }
        } catch (error) {
          log.error('Error creating notifications:', error)
        }
        return result
      } finally {
        writeAddress.value = undefined
      }
    }
  })

  return { ...mutation, executeAddAction: mutation.mutateAsync }
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
    abi: boardOfDirectorsAbi,
    functionName: BOD_FUNCTION_NAMES.APPROVE,
    onSuccess: async () => {
      if (bodAddress.value && currentDbId.value) {
        try {
          const isActionExecuted = await readContract(config, {
            address: bodAddress.value,
            abi: boardOfDirectorsAbi,
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
    return mutation.mutateAsync({ args: [BigInt(actionId)] })
  }

  return {
    ...mutation,
    executeApproveAction
  }
}
