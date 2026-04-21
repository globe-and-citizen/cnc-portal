// UNUSED — all exported writes in this module currently have no consumers
// outside their own spec + mock setup. Kept for reference; re-enable when
// wiring up an InvestorV1 write flow.
/*
import { computed } from 'vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type InvestorFunctionNames = ExtractAbiFunctionNames<typeof INVESTOR_ABI>

function useInvestorContractWrite(functionName: InvestorFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))
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

export function useTransfer() {
  return useInvestorContractWrite('transfer')
}

export function usePause() {
  return useInvestorContractWrite('pause')
}

export function useUnpause() {
  return useInvestorContractWrite('unpause')
}

export function useInitialize() {
  return useInvestorContractWrite('initialize')
}

export function useTransferOwnership() {
  return useInvestorContractWrite('transferOwnership')
}

export function useRenounceOwnership() {
  return useInvestorContractWrite('renounceOwnership')
}

export function useDepositDividends() {
  return useInvestorContractWrite('distributeNativeDividends')
}

export function useDepositTokenDividends() {
  return useInvestorContractWrite('distributeTokenDividends')
}
*/
export {}
