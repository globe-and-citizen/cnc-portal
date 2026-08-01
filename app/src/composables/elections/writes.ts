import { computed } from 'vue'
import { electionsAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import { type ElectionsFunctionName } from './reads'

function useElectionsContractWrite(functionName: ElectionsFunctionName) {
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
