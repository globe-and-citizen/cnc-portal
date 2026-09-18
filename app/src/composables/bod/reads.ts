import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, isAddressEqual, type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { bankAbi, boardOfDirectorsAbi } from '@/artifacts/abi/generated'
/**
 * BOD contract types and constants
 */
export const BOD_FUNCTION_NAMES = {
  // Read functions
  IS_ACTION_EXECUTED: 'isActionExecuted',
  IS_APPROVED: 'isApproved',
  GET_OWNERS: 'getOwners',
  GET_BOARD_OF_DIRECTORS: 'getBoardOfDirectors',
  IS_MEMBER: 'isMember',
  APPROVAL_COUNT: 'approvalCount',

  // Write functions
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

/** Read the owner of a Bank that may be controlled by a Board contract. */
export function useBodOwner(contractAddress: MaybeRef<Address>) {
  const bankAddress = computed(() => unref(contractAddress))
  const isAddressValid = computed(() => !!bankAddress.value && isAddress(bankAddress.value))

  return useReadContract({
    address: bankAddress,
    abi: bankAbi,
    functionName: 'owner',
    query: { enabled: isAddressValid }
  })
}

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
    abi: boardOfDirectorsAbi,
    functionName: 'isActionExecuted',
    args: [BigInt(actionIdValue.value)] as const,
    query: { enabled: isBodAddressValid }
  })
}

// UNUSED — no consumers outside bod.setup.ts.
/*
export function useBodIsApproved(actionId: MaybeRef<number>, memberAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))
  const actionIdValue = computed(() => unref(actionId))
  const memberAddressValue = computed(() => unref(memberAddress))

  return useReadContract({
    address: bodAddress,
    abi: boardOfDirectorsAbi,
    functionName: 'isApproved',
    args: [BigInt(actionIdValue.value), memberAddressValue.value] as const,
    query: {
      enabled: computed(() => isBodAddressValid.value && isAddress(memberAddressValue.value))
    }
  })
}
*/

/**
 * Members currently seated on the Board of Directors.
 *
 * Every page listing the board reads it here: publishing an election
 * invalidates the Board contract's reads from the election write layer, which
 * is what keeps the list current without anyone refreshing it by hand.
 */
export function useBodGetBoardOfDirectors() {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))

  return useReadContract({
    address: bodAddress,
    abi: boardOfDirectorsAbi,
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
    abi: boardOfDirectorsAbi,
    functionName: 'isMember',
    args: [memberAddressValue.value] as const,
    query: {
      enabled: computed(() => isBodAddressValid.value && isAddress(memberAddressValue.value))
    }
  })
}

// UNUSED — no consumers outside bod.setup.ts.
/*
export function useBodApprovalCount() {
  const teamStore = useTeamStore()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
  const isBodAddressValid = computed(() => !!bodAddress.value && isAddress(bodAddress.value))

  return useReadContract({
    address: bodAddress,
    abi: boardOfDirectorsAbi,
    functionName: 'approvalCount',
    query: { enabled: isBodAddressValid }
  })
}
*/

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
    const ownerAddress = owner.value as Address | undefined
    const currentBodAddress = bodAddress.value

    return Boolean(
      ownerAddress &&
      currentBodAddress &&
      isAddressEqual(ownerAddress, currentBodAddress) &&
      isBodMember.value
    )
  })

  return {
    isBodAction
  }
}
