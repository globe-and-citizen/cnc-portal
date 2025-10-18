import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Abi, type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { BOD_FUNCTION_NAMES } from './types'
import { BOD_ABI } from '@/artifacts/abi/bod'

/**
 * BOD contract read operations
 */
export function useBodReads() {
  const teamStore = useTeamStore()
  const userDataStore = useUserDataStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))

  // Removed useBodPaused - BOD contract doesn't have a paused function
  // If you need to check pause status, use the Bank contract's paused function instead

  const useBodOwner = (contractAddress: Address, contractAbi: Abi) => {
    return useReadContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: BOD_FUNCTION_NAMES.OWNER,
      query: { enabled: isBodAddressValid }
    })
  }

  const useBodIsActionExecuted = (actionId: number) => {
    return useReadContract({
      address: bodAddress,
      abi: BOD_ABI,
      functionName: 'isActionExecuted' as const,
      args: [BigInt(actionId)] as const,
      query: { enabled: isBodAddressValid }
    })
  }

  const useBodIsApproved = (actionId: number, memberAddress: Address) => {
    return useReadContract({
      address: bodAddress,
      abi: BOD_ABI,
      functionName: 'isApproved' as const,
      args: [BigInt(actionId), memberAddress] as const,
      query: {
        enabled: computed(
          () => !!bodAddress.value && isAddress(bodAddress.value) && isAddress(memberAddress)
        )
      }
    })
  }

  const useBodGetBoardOfDirectors = () => {
    return useReadContract({
      address: bodAddress.value,
      abi: BOD_ABI,
      functionName: BOD_FUNCTION_NAMES.GET_BOARD_OF_DIRECTORS,
      query: { enabled: isBodAddressValid }
    })
  }

  const useBodIsMember = (memberAddress: Address) => {
    return useReadContract({
      address: bodAddress.value,
      abi: BOD_ABI,
      functionName: BOD_FUNCTION_NAMES.IS_MEMBER,
      args: [memberAddress],
      query: {
        enabled: computed(
          () => !!bodAddress.value && isAddress(bodAddress.value) && isAddress(memberAddress)
        )
      }
    })
  }

  const useBodApprovalCount = () => {
    return useReadContract({
      address: bodAddress.value,
      abi: BOD_ABI,
      functionName: BOD_FUNCTION_NAMES.APPROVAL_COUNT,
      query: { enabled: isBodAddressValid }
    })
  }

  const useBodIsBodAction = (contractAddress: Address, contractAbi: Abi) => {
    const { data: isBodMember } = useBodIsMember(userDataStore.address as Address)
    const { data: owner } = useBodOwner(contractAddress, contractAbi)
    const isBodAction = computed(() => {
      return owner.value === bodAddress.value && (isBodMember.value as boolean)
    })
    return {
      isBodAction
    }
  }
  const { data: boardOfDirectors } = useBodGetBoardOfDirectors()

  return {
    bodAddress,
    isBodAddressValid,
    boardOfDirectors,
    useBodIsBodAction,
    // useBodPaused, // Removed: BOD contract doesn't have a paused function
    useBodOwner,
    useBodIsActionExecuted,
    useBodIsApproved,
    useBodGetBoardOfDirectors,
    useBodIsMember,
    useBodApprovalCount
  }
}
