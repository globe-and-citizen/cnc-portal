import { encodeFunctionData, type Abi, type Address } from 'viem'
import { useToastStore, useTeamStore } from '@/stores'
import { useBodWrites } from './writes'
import { BOD_FUNCTION_NAMES } from './types'
import { useValidation } from '@/composables/bank'
import type { Action } from '@/types'
import { computed, ref, watch } from 'vue'
import { estimateGas, readContract, writeContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import BOD_ABI from '@/artifacts/abi/bod.json'
import { useCustomFetch } from '@/composables'
import { useQueryClient } from '@tanstack/vue-query'
import { log, parseError } from '@/utils'

/**
 * BOD contract write functions - combines admin, transfers, and tipping
 */
export function useBodWritesFunctions() {
  const writes = useBodWrites()
  const { validateAddress } = useValidation()
  const teamStore = useTeamStore()
  const { addErrorToast, addSuccessToast } = useToastStore()
  const queryClient = useQueryClient()

  const action = ref<Partial<Action> | null>(null)
  const actionUrl = ref('')
  const isLoadingApproveAction = ref(false)
  const isActionAdded = ref(false)
  const isActionApproved = ref(false)
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const { execute: executeSaveAction } = useCustomFetch('actions/', {
    immediate: false
  }).post(action)

  const { execute: executeUpdateAction } = useCustomFetch(actionUrl, {
    immediate: false
  }).patch()

  const { isConfirmed, isConfirming } = writes

  watch(isConfirming, async (newStatus, oldStatus) => {
    if (oldStatus && !newStatus && isConfirmed.value) {
      await executeSaveAction()
      isActionAdded.value = true
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
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
      console.log('BOD address not found, skipping approval.')
      return
    }
    try {
      const data = encodeFunctionData({
        abi: BOD_ABI,
        functionName: 'approve',
        args: [_actionId]
      })
      await estimateGas(config, {
        to: bodAddress.value,
        data
      })
      await writeContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'approve',
        args: [_actionId]
      })
      const isActionExecuted = await readContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'isActionExecuted',
        args: [_actionId]
      })
      if (isActionExecuted) {
        actionUrl.value = `actions/${dbId}`
        await executeUpdateAction()
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
      log.error('Error approving action: ', parseError(error, BOD_ABI as Abi))
      addErrorToast(parseError(error, BOD_ABI as Abi))
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
    isActionAdded
  }
}
