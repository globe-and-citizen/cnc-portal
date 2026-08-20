import { computed } from 'vue'
import { electionsAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

/**
 * State-changing names only. `ElectionsFunctionName` in ./reads covers every
 * function on the contract, reads included, so it is the wrong constraint here.
 */
type ElectionsWriteNames = WriteFunctionName<typeof electionsAbi>

function useElectionsContractWrite<F extends ElectionsWriteNames>(functionName: F) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('Elections'))
  return useContractWritesV3({
    contractAddress,
    abi: electionsAbi,
    functionName
  })
}

export function useElectionsCreateElection() {
  return useElectionsContractWrite('createElection')
}

export function useElectionsPublishResults() {
  return useElectionsContractWrite('publishResults')
}

export function useElectionsCastVote() {
  return useElectionsContractWrite('castVote')
}
