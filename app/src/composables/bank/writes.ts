import { computed } from 'vue'
import { bankAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type BankFunctionNames = ExtractAbiFunctionNames<typeof bankAbi>

function useBankContractWrite(functionName: BankFunctionNames) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWritesV3({
    contractAddress: bankAddress,
    abi: bankAbi,
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

export function useFundFixedReturnRepayment() {
  return useBankContractWrite('fundFixedReturnRepayment')
}
