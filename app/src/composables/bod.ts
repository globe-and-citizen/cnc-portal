import { computed, ref, watch } from 'vue'
import type { Action, Team } from '@/types'
import { useCreateActionMutation } from '@/queries/action.queries'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { Address } from 'viem'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'

export function useAddAction() {
  const loadingContract = ref(false)
  const actionCount = ref<bigint | null>(null)
  const team = ref<Partial<Team> | null>(null)
  const action = ref<Partial<Action> | null>(null)

  const createActionMutation = useCreateActionMutation()

  const {
    data: hash,
    writeContract: executeAddAction,
    isPending: addActionLoading
  } = useWriteContract()

  const {
    isSuccess,
    isLoading: isConfirming,
    error
  } = useWaitForTransactionReceipt({
    hash
  })

  async function addAction(teamData: Partial<Team>, actionData: Partial<Action>) {
    try {
      loadingContract.value = true
      const boardOfDirectorsAddress = teamData.teamContracts?.find(
        (contract) => contract.type === 'BoardOfDirectors'
      )?.address as Address
      actionCount.value = (await readContract(config, {
        address: boardOfDirectorsAddress,
        functionName: 'actionCount',
        abi: BOD_ABI
      })) as bigint
      team.value = teamData
      action.value = actionData

      executeAddAction({
        address: boardOfDirectorsAddress,
        functionName: 'addAction',
        abi: BOD_ABI,
        args: [
          actionData.targetAddress as Address,
          actionData.description as string,
          actionData.data as `0x${string}`
        ]
      })
    } catch (err) {
      console.error(err)
    } finally {
      loadingContract.value = false
    }
  }

  watch(isSuccess, async (success) => {
    if (success && team.value && action.value) {
      await createActionMutation.mutateAsync({
        teamId: Number(team.value.id),
        actionId: Number(actionCount.value ?? 0),
        targetAddress: action.value.targetAddress,
        description: action.value.description,
        data: action.value.data
      })
    }
  })

  const loading = computed(() => isConfirming.value || addActionLoading.value)

  return { execute: addAction, isLoading: loading, error, isSuccess }
}
