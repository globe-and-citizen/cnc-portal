import { computed } from 'vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type InvestorFunctionNames = ExtractAbiFunctionNames<typeof INVESTOR_ABI>

function useInvestorContractWrite(functionName: InvestorFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getInvestorAddress())
  return useContractWritesV3({
    contractAddress,
    abi: INVESTOR_ABI,
    functionName
  })
}

export function useIndividualMint() {
  return useInvestorContractWrite('individualMint')
}

export function useDistributeMint() {
  return useInvestorContractWrite('distributeMint')
}
