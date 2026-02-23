import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'

/**
 * Elections contract types and constants
 */
export const ELECTIONS_FUNCTION_NAMES = {
  // Read functions
  OWNER: 'owner',
  GET_ELECTION: 'getElection',
  GET_VOTE_COUNT: 'getVoteCount',
  GET_ELECTION_CANDIDATES: 'getElectionCandidates',
  GET_ELECTION_ELIGIBLE_VOTERS: 'getElectionEligibleVoters',
  GET_ELECTION_WINNERS: 'getElectionWinners',
  HAS_VOTED: 'hasVoted',

  // Write functions
  CREATE_ELECTION: 'createElection',
  CAST_VOTE: 'castVote',
  PUBLISH_RESULTS: 'publishResults'
} as const

/**
 * Type for valid Elections contract function names
 */
export type ElectionsFunctionName =
  (typeof ELECTIONS_FUNCTION_NAMES)[keyof typeof ELECTIONS_FUNCTION_NAMES]

/**
 * Validate if a function name exists in the Elections contract
 */
export function isValidElectionsFunction(
  functionName: string
): functionName is ElectionsFunctionName {
  return Object.values(ELECTIONS_FUNCTION_NAMES).includes(functionName as ElectionsFunctionName)
}

/**
 * Elections contract address helper
 */
export function useElectionsAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Elections'))
}

/**
 * Read owner of the Elections contract
 */
export function useElectionsOwner() {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'owner',
    query: { enabled: isElectionsAddressValid }
  })
}

/**
 * Get election details by ID
 */
export function useElectionsGetElection(electionId: MaybeRef<bigint>) {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )
  const electionIdValue = computed(() => unref(electionId))

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'getElection',
    args: [electionIdValue],
    query: {
      enabled: computed(() => isElectionsAddressValid.value && !!electionIdValue.value)
    }
  })
}

/**
 * Get vote count for an election
 */
export function useElectionsGetVoteCount(electionId: MaybeRef<bigint>) {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )
  const electionIdValue = computed(() => unref(electionId))

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'getVoteCount',
    args: [electionIdValue],
    query: {
      enabled: computed(() => isElectionsAddressValid.value && !!electionIdValue.value)
    }
  })
}

/**
 * Get candidates for an election
 */
export function useElectionsGetCandidates(electionId: MaybeRef<bigint>) {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )
  const electionIdValue = computed(() => unref(electionId))

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'getElectionCandidates',
    args: [electionIdValue],
    query: {
      enabled: computed(() => isElectionsAddressValid.value && !!electionIdValue.value)
    }
  })
}

/**
 * Get eligible voters for an election
 */
export function useElectionsGetEligibleVoters(electionId: MaybeRef<bigint>) {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )
  const electionIdValue = computed(() => unref(electionId))

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'getElectionEligibleVoters',
    args: [electionIdValue],
    query: {
      enabled: computed(() => isElectionsAddressValid.value && !!electionIdValue.value)
    }
  })
}

/**
 * Get winner(s) of an election
 */
export function useElectionsGetWinners(electionId: MaybeRef<bigint>) {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )
  const electionIdValue = computed(() => unref(electionId))

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'getElectionWinners',
    args: [electionIdValue],
    query: {
      enabled: computed(() => isElectionsAddressValid.value && !!electionIdValue.value)
    }
  })
}

/**
 * Check if an address has voted in an election
 */
export function useElectionsHasVoted(electionId: MaybeRef<bigint>, voter: MaybeRef<Address>) {
  const electionsAddress = useElectionsAddress()
  const isElectionsAddressValid = computed(
    () => !!electionsAddress.value && isAddress(electionsAddress.value)
  )
  const electionIdValue = computed(() => unref(electionId))
  const voterValue = computed(() => unref(voter))

  return useReadContract({
    address: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: 'hasVoted',
    args: [electionIdValue, voterValue],
    query: {
      enabled: computed(
        () =>
          isElectionsAddressValid.value && !!electionIdValue.value && isAddress(voterValue.value)
      )
    }
  })
}
