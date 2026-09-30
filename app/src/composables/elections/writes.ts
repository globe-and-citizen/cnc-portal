import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { electionsAbi } from '@/artifacts/abi/generated'
import {
  contractReadsOfAddress,
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import { electionVoteReadsOfAddress } from './invalidation'

/** State-changing names only — the reads live in ./reads. */
type ElectionsWriteNames = WriteFunctionName<typeof electionsAbi>

function useElectionsContractWrite<F extends ElectionsWriteNames>(
  functionName: F,
  options: {
    onSuccess?: () => Promise<void>
    invalidateContractReads?: boolean
  } = {}
) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('Elections'))
  return useContractWritesV3({
    contractAddress,
    abi: electionsAbi,
    functionName,
    config: { invalidateContractReads: options.invalidateContractReads },
    onSuccess: options.onSuccess
  })
}

export function useElectionsCreateElection() {
  return useElectionsContractWrite('createElection')
}

/**
 * Publishing seats the winners on the Board of Directors and moves the election
 * into the history the past-elections list keeps under its own key. Neither is a
 * read of the Elections contract, so the built-in invalidation cannot reach
 * them — the fact belongs here rather than in whichever component happens to
 * hold the button.
 */
export function useElectionsPublishResults() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()

  return useElectionsContractWrite('publishResults', {
    onSuccess: async () => {
      const boardAddress = teamStore.getContractAddressByType('BoardOfDirectors')

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pastElections'] }),
        boardAddress
          ? queryClient.invalidateQueries({ predicate: contractReadsOfAddress(boardAddress) })
          : Promise.resolve()
      ])
    }
  })
}

export function useElectionsCastVote() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()

  return useElectionsContractWrite('castVote', {
    // A vote changes the ballot, not the immutable election record. Refreshing
    // only the vote-dependent reads keeps the details page stable after cast.
    invalidateContractReads: false,
    onSuccess: async () => {
      const electionsAddress = teamStore.getContractAddressByType('Elections')
      if (!electionsAddress) return

      await queryClient.invalidateQueries({
        predicate: electionVoteReadsOfAddress(electionsAddress)
      })
    }
  })
}
