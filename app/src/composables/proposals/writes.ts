import { computed } from 'vue'
import { proposalsAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type ProposalsFunctionNames = WriteFunctionName<typeof proposalsAbi>

function useProposalsContractWrite<F extends ProposalsFunctionNames>(functionName: F) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('Proposals'))
  return useContractWritesV3({
    contractAddress,
    abi: proposalsAbi,
    functionName
  })
}

export function useProposalsCreateProposal() {
  return useProposalsContractWrite('createProposal')
}

export function useProposalsCastVote() {
  return useProposalsContractWrite('castVote')
}
