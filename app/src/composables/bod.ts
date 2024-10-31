import { ref } from 'vue'
import { BoDService } from '@/services/bodService'
import type { Action, Team } from '@/types'
import { useCustomFetch } from './useCustomFetch'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { Address } from 'viem'
import BoDABI from '@/artifacts/abi/bod.json'
const bodService = new BoDService()

export function useAddAction() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(true)

  async function addAction(team: Partial<Team>, action: Partial<Action>) {
    try {
      isSuccess.value = false
      loading.value = true
      const actionCount = await readContract(config, {
        address: team.boardOfDirectorsAddress as Address,
        functionName: 'actionCount',
        abi: BoDABI
      })
      // const actionCount = await bodService.getActionCount(team.boardOfDirectorsAddress!)
      await bodService.addAction(team.boardOfDirectorsAddress!, action)

      useCustomFetch(`actions`, {
        immediate: true
      }).post({
        teamId: team.id?.toString(),
        actionId: parseInt((actionCount ?? 0).toString()),
        targetAddress: action.targetAddress,
        description: action.description,
        data: action.data
      })
      isSuccess.value = true
    } catch (err) {
      console.error(err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: addAction, isLoading: loading, error, isSuccess }
}
