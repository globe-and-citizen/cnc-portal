import { computed, ref, watch } from 'vue'
import type { Action, ContractType } from '@/types'
import { useCustomFetch } from './useCustomFetch'
import { estimateGas, readContract, writeContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { encodeFunctionData, type Abi } from 'viem'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useToastStore, useTeamStore, useUserDataStore } from '@/stores'
import { log, parseError } from '@/utils'

export function useBod(contractType: ContractType, contractAbi: Abi) {
  const teamStore = useTeamStore()
  const userDataStore = useUserDataStore()
  const queryClient = useQueryClient()
  const { addSuccessToast, addErrorToast } = useToastStore()

  const loadingContract = ref(false)
  // const actionId = ref<bigint | null>(null)
  // const team = ref<Partial<Team> | null>(null)
  const action = ref<Partial<Action> | null>(null)
  const isActionAdded = ref(false)
  const isActionApproved = ref(false)
  const actionUrl = ref('')
  const isLoadingApproveAction = ref(false)

  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const contractAddress = computed(() => teamStore.getContractAddressByType(contractType))

  const { /*error: errorSaveAction,*/ execute: executeSaveAction } = useCustomFetch('actions/', {
    immediate: false
  }).post(action)

  const { /*error: errorUpdateAction,*/ execute: executeUpdateAction } = useCustomFetch(actionUrl, {
    immediate: false
  }).patch()

  const { data: isMember } = useReadContract({
    address: bodAddress,
    abi: BOD_ABI,
    functionName: 'isMember',
    args: [userDataStore.address]
  })

  const { data: owner } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'owner'
  })

  const isBodAction = computed(() => {
    return owner.value === bodAddress.value && (isMember.value as boolean)
  })

  // const {
  //   data: hashApproveAction,
  //   writeContract: executeApproveAction,
  //   isPending: isLoadingApproveAction
  //   // error: errorApproveAction
  // } = useWriteContract()

  // const { isLoading: isConfirmingApproveAction, isSuccess: isConfirmedApproveAction } =
  //   useWaitForTransactionReceipt({
  //     hash: hashApproveAction
  //   })

  const {
    data: hashAddAction,
    writeContract: executeAddAction,
    isPending: isLoadingAddAction
    // error: errorAddAction
  } = useWriteContract()

  const { isLoading: isConfirmingAddAction, isSuccess: isConfirmedAddAction } =
    useWaitForTransactionReceipt({
      hash: hashAddAction
    })

  // watch(isConfirmingApproveAction, async (isConfirming, wasConfirming) => {
  //   if (wasConfirming && !isConfirming && isConfirmedApproveAction.value) {
  //     // await executeUpdateAction()
  //     await queryClient.invalidateQueries({
  //       queryKey: ['readContract']
  //     })
  //     addSuccessToast('Action approved successfully!')
  //     // emits('contract-status-changed')
  //     isActionApproved.value = true
  //   }
  // })

  watch(isConfirmingAddAction, async (isConfirming, wasConfirming) => {
    if (wasConfirming && !isConfirming && isConfirmedAddAction.value) {
      await executeSaveAction()
      addSuccessToast('Action added successfully!')
      // emits('contract-status-changed')
      isActionAdded.value = true
    }
  })

  const approveAction = async (_actionId: number, dbId: number) => {
    isActionApproved.value = false
    isLoadingApproveAction.value = true
    if (!isBodAction.value) {
      console.log(`Not a BOD action, skipping approval ${isBodAction.value}, ${isMember.value}.`)
      return
    }

    if (!bodAddress.value) {
      console.log('BOD address not found, skipping approval.')
      return
    }
    try {
      const data = encodeFunctionData({
        abi: BOD_ABI,
        functionName: 'approve',
        args: [BigInt(_actionId)]
      })
      await estimateGas(config, {
        to: bodAddress.value,
        data
      })
      await writeContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'approve',
        args: [BigInt(_actionId)]
      })
      const isActionExecuted = await readContract(config, {
        address: bodAddress.value,
        abi: BOD_ABI,
        functionName: 'isActionExecuted',
        args: [BigInt(_actionId)]
      })
      if (isActionExecuted) {
        actionUrl.value = `actions/${dbId}`
        await executeUpdateAction()
      }
      await queryClient.invalidateQueries({
        queryKey: ['readContract']
      })
      addSuccessToast('Action approved successfully!')
      isLoadingApproveAction.value = false
      isActionApproved.value = true
      // executeApproveAction({
      //   address: bodAddress.value,
      //   abi: BOD_ABI,
      //   functionName: 'approve',
      //   args: [_actionId]
      // })
      // actionId.value = BigInt(_actionId)
    } catch (error) {
      log.error('Error approving action: ', parseError(error, BOD_ABI))
      addErrorToast(parseError(error, BOD_ABI))
    }
  }

  async function addAction(actionData: Partial<Action>) {
    isActionAdded.value = false
    try {
      if (!bodAddress.value) throw new Error('BOD address not found')
      if (!teamStore.currentTeamId) throw new Error('No current team ID found')
      loadingContract.value = true
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

      executeAddAction({
        address: bodAddress.value,
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

  return {
    addAction,
    approveAction,
    isActionAdded,
    isActionApproved,
    isLoadingAddAction,
    isLoadingApproveAction,
    isConfirmingAddAction,
    isBodAction
  }
}
