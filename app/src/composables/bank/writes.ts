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

export function useTransfer() {
  return useBankContractWrite('transfer')
}

export function useTransferToken() {
  return useBankContractWrite('transferToken')
}
