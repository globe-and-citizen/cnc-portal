import { computed, unref, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores'
import { ELECTIONS_FUNCTION_NAMES, type ElectionsFunctionName } from './reads'

/**
 * Helper function to create an Elections contract write
 */
function useElectionsContractWrite(options: {
  functionName: ElectionsFunctionName
  args?: MaybeRef<readonly unknown[]>
}) {
  const teamStore = useTeamStore()
  const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

  return useContractWrites({
    contractAddress: electionsAddress,
    abi: ELECTIONS_ABI,
    functionName: options.functionName,
    args: options.args ?? []
  })
}

/**
 * Create a new election
 */
export function useElectionsCreateElection(
  title: MaybeRef<string>,
  description: MaybeRef<string>,
  startDate: MaybeRef<bigint>,
  endDate: MaybeRef<bigint>,
  seatCount: MaybeRef<bigint>,
  candidates: MaybeRef<readonly Address[]>,
  voters: MaybeRef<readonly Address[]>
) {
  const args = computed(
    () =>
      [
        unref(title),
        unref(description),
        unref(startDate),
        unref(endDate),
        unref(seatCount),
        unref(candidates),
        unref(voters)
      ] as readonly unknown[]
  )

  return useElectionsContractWrite({
    functionName: ELECTIONS_FUNCTION_NAMES.CREATE_ELECTION,
    args
  })
}

/**
 * Cast a vote in an election
 */
export function useElectionsCastVote(
  electionId: MaybeRef<bigint>,
  candidateAddresses: MaybeRef<readonly Address[]>
) {
  const args = computed(() => [unref(electionId), unref(candidateAddresses)] as readonly unknown[])

  return useElectionsContractWrite({
    functionName: ELECTIONS_FUNCTION_NAMES.CAST_VOTE,
    args
  })
}

/**
 * Publish election results
 */
export function useElectionsPublishResults(electionId: MaybeRef<bigint>) {
  const args = computed(() => [unref(electionId)] as readonly unknown[])

  return useElectionsContractWrite({
    functionName: ELECTIONS_FUNCTION_NAMES.PUBLISH_RESULTS,
    args
  })
}
