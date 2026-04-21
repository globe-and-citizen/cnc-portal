import { computed } from 'vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import { type ElectionsFunctionName } from './reads'

function useElectionsContractWrite(functionName: ElectionsFunctionName) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('Elections'))
  return useContractWritesV3({
    contractAddress,
    abi: ELECTIONS_ABI,
    functionName
  })
}

export function useElectionsCreateElection() {
  return useElectionsContractWrite('createElection')
}

export function useElectionsCastVote() {
  return useElectionsContractWrite('castVote')
}

export function useElectionsPublishResults() {
  return useElectionsContractWrite('publishResults')
}
