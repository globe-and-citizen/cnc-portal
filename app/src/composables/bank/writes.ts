import { computed } from 'vue'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type BankFunctionNames = ExtractAbiFunctionNames<typeof BANK_ABI>

function useBankContractWrite(functionName: BankFunctionNames) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWritesV3({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName
  })
}

export function useDepositToken() {
  return useBankContractWrite('depositToken')
}

export function useDistributeNativeDividends() {
  return useBankContractWrite('distributeNativeDividends')
}

export function useDistributeTokenDividends() {
  return useBankContractWrite('distributeTokenDividends')
}

// UNUSED — no consumers outside bank.setup.ts + bankWrites.spec.ts.
// See inline comment for the commented-out definitions.
/*
export function useAddTokenSupport() {
  return useBankContractWrite('addTokenSupport')
}

export function useRemoveTokenSupport() {
  return useBankContractWrite('removeTokenSupport')
}

export function useTransfer() {
  return useBankContractWrite('transfer')
}

export function useTransferToken() {
  return useBankContractWrite('transferToken')
}

export function useTransferOwnership() {
  return useBankContractWrite('transferOwnership')
}

export function useRenounceOwnership() {
  return useBankContractWrite('renounceOwnership')
}

export function usePause() {
  return useBankContractWrite('pause')
}

export function useUnpause() {
  return useBankContractWrite('unpause')
}
*/
