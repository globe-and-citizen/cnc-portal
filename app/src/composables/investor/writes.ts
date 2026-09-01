import { computed } from 'vue'
import { investorAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type InvestorFunctionNames = WriteFunctionName<typeof investorAbi>

function useInvestorContractWrite<F extends InvestorFunctionNames>(functionName: F) {
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
