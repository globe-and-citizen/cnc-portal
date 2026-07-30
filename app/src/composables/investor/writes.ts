import { computed } from 'vue'
import { investorAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type InvestorFunctionNames = ExtractAbiFunctionNames<typeof investorAbi>

function useInvestorContractWrite(functionName: InvestorFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getInvestorAddress())
  return useContractWritesV3({
    contractAddress,
    abi: investorAbi,
    functionName
  })
}

export function useIndividualMint() {
  return useInvestorContractWrite('individualMint')
}

export function useDistributeMint() {
  return useInvestorContractWrite('distributeMint')
}
