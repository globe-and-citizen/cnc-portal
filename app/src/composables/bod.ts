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
  const actionCount = ref<bigint | null>(null)
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
      const boardOfDirectorsAddress = teamData.teamContracts?.find(
        (contract) => contract.type === 'BoardOfDirectors'
      )?.address as Address
      actionCount.value = (await readContract(config, {
        address: boardOfDirectorsAddress,
        functionName: 'actionCount',
        abi: BoDABI
      })) as bigint
      team.value = teamData
      action.value = actionData

      executeAddAction({
        address: boardOfDirectorsAddress,
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
