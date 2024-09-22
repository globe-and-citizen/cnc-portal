import { ref } from 'vue'
import { BoDService } from '@/services/bodService'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { BOD_ABI } from '@/artifacts/abi/bod'
import type { Address } from 'viem'
import type { Action } from '@/types'

const bodService = new BoDService()

export function useDeployBoDContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function deploy(teamId: string, votingAddress: string) {
    try {
      loading.value = true
      contractAddress.value = await bodService.createBODContract(teamId, votingAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, contractAddress }
}
export function useGetBoardOfDirectors() {
  const boardOfDirectors = ref<string[] | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function getBoardOfDirectors(bodAddress: string) {
    try {
      loading.value = true
      boardOfDirectors.value = await bodService.getBoardOfDirectors(bodAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getBoardOfDirectors, isLoading: loading, isSuccess, error, boardOfDirectors }
}

export function useGetActions(bodAddress: string) {
  const actions = ref<Action[] | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function getActions(startIndex: bigint, limit: bigint = BigInt(10)) {
    try {
      loading.value = true
      actions.value = (await readContract(config, {
        address: bodAddress as Address,
        abi: BOD_ABI,
        functionName: 'getActions',
        args: [startIndex, limit]
      })) as Action[]
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getActions, isLoading: loading, error, data: actions }
}
