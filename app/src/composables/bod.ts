import { computed, ref, watch } from 'vue'
import type { Action, Team } from '@/types'
import { useCustomFetch } from './useCustomFetch'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { Address } from 'viem'
import BoDABI from '@/artifacts/abi/bod.json'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'

export function useAddAction() {
  const loadingContract = ref(false)
  const actionCount = ref<BigInt | null>(null)
  const team = ref<Partial<Team> | null>(null)
  const action = ref<Partial<Action> | null>(null)

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
      actionCount.value = (await readContract(config, {
        address: teamData.boardOfDirectorsAddress as Address,
        functionName: 'actionCount',
        abi: BoDABI
      })) as BigInt
      team.value = teamData
      action.value = actionData

      executeAddAction({
        address: teamData.boardOfDirectorsAddress as Address,
        functionName: 'addAction',
        abi: BoDABI,
        args: [actionData.targetAddress, actionData.description, actionData.data]
      })
    } catch (err) {
      console.error(err)
    } finally {
      loadingContract.value = false
    }
  }

  watch(isSuccess, async (success) => {
    if (success) {
      await useCustomFetch(`actions`, {
        immediate: true
      }).post({
        teamId: team.value!.id?.toString(),
        actionId: parseInt((actionCount.value ?? 0).toString()),
        targetAddress: action.value!.targetAddress,
        description: action.value!.description,
        data: action.value!.data
      })
    }
  })

  const loading = computed(() => isConfirming.value || addActionLoading.value)

  return { execute: addAction, isLoading: loading, error, isSuccess }
}
