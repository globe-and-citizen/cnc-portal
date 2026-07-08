import { computed } from 'vue'
import type { ExtractAbiFunctionNames } from 'abitype'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type ProposalsFunctionNames = ExtractAbiFunctionNames<typeof PROPOSALS_ABI>

function useProposalsContractWrite(functionName: ProposalsFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('Proposals'))
  return useContractWritesV3({
    contractAddress,
    abi: PROPOSALS_ABI,
    functionName
  })
}

export function useProposalsCreateProposal() {
  return useProposalsContractWrite('createProposal')
}

export function useProposalsCastVote() {
  return useProposalsContractWrite('castVote')
}
