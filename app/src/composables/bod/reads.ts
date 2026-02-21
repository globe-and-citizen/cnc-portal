import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { BOD_ABI } from '@/artifacts/abi/bod'

/**
 * BOD contract types and constants
 */
export const BOD_FUNCTION_NAMES = {
  // Read functions
  PAUSED: 'paused',
  OWNER: 'owner',
  IS_ACTION_EXECUTED: 'isActionExecuted',
  IS_APPROVED: 'isApproved',
  GET_OWNERS: 'getOwners',
  GET_BOARD_OF_DIRECTORS: 'getBoardOfDirectors',
  IS_MEMBER: 'isMember',
  APPROVAL_COUNT: 'approvalCount',

  // Write functions
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  ADD_ACTION: 'addAction',
  APPROVE: 'approve',
  REVOKE: 'revoke',
  SET_BOARD_OF_DIRECTORS: 'setBoardOfDirectors',
  INITIALIZE: 'initialize'
} as const

/**
 * Type for valid BOD contract function names
 */
export type BodFunctionName = (typeof BOD_FUNCTION_NAMES)[keyof typeof BOD_FUNCTION_NAMES]

/**
 * Validate if a function name exists in the BOD contract
 */
export function isValidBodFunction(functionName: string): functionName is BodFunctionName {
  return Object.values(BOD_FUNCTION_NAMES).includes(functionName as BodFunctionName)
}

/**
 * Read owner of a contract
 */
// export function useBodOwner(contractAddress: MaybeRef<Address>) {
//   const bodAddress = computed(() => unref(contractAddress))
//   const isAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))

//   return useReadContract({
//     address: bodAddress,
//     abi: BOD_ABI,
//     functionName: 'owner',
//     query: { enabled: isAddressValid }
//   })
// }

/**
 * Check if an action has been executed
 */
export function useBodIsActionExecuted(actionId: MaybeRef<number>) {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))
  const actionIdValue = computed(() => unref(actionId))

  return useReadContract({
    address: bodAddress,
    abi: BOD_ABI,
    functionName: 'isActionExecuted',
    args: [BigInt(actionIdValue.value)] as const,
    query: { enabled: isBodAddressValid }
  })
}

/**
 * Check if a member has approved an action
 */
export function useBodIsApproved(actionId: MaybeRef<number>, memberAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))
  const actionIdValue = computed(() => unref(actionId))
  const memberAddressValue = computed(() => unref(memberAddress))

  return useReadContract({
    address: bodAddress,
    abi: BOD_ABI,
    functionName: 'isApproved',
    args: [BigInt(actionIdValue.value), memberAddressValue.value] as const,
    query: {
      enabled: computed(() => isBodAddressValid.value && isAddress(memberAddressValue.value))
    }
  })
}

/**
 * Get the current board of directors
 */
export function useBodGetBoardOfDirectors() {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))

  return useReadContract({
    address: bodAddress,
    abi: BOD_ABI,
    functionName: 'getBoardOfDirectors',
    query: { enabled: isBodAddressValid }
  })
}

/**
 * Check if an address is a BOD member
 */
export function useBodIsMember(memberAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))
  const memberAddressValue = computed(() => unref(memberAddress))

  return useReadContract({
    address: bodAddress,
    abi: BOD_ABI,
    functionName: 'isMember',
    args: [memberAddressValue.value] as const,
    query: {
      enabled: computed(() => isBodAddressValid.value && isAddress(memberAddressValue.value))
    }
  })
}

/**
 * Get the approval count for an action
 */
export function useBodApprovalCount() {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))

  return useReadContract({
    address: bodAddress,
    abi: BOD_ABI,
    functionName: 'approvalCount',
    query: { enabled: isBodAddressValid }
  })
}

/**
 * Check if an action is a BOD action (combine multiple reads)
 */
export function useBodIsBodAction(contractAddress: MaybeRef<Address>) {
  const userDataStore = useUserDataStore()
  const { data: isBodMember } = useBodIsMember(userDataStore.address as Address)
  const { data: owner } = useBodOwner(contractAddress)

  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  const isBodAction = computed(() => {
    return owner.value === bodAddress.value && (isBodMember.value as boolean)
  })

  return {
    isBodAction
  }
}
