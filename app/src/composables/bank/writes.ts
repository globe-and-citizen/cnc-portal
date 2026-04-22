import { computed, unref, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type BankFunctionNames = ExtractAbiFunctionNames<typeof BANK_ABI>

function useBankContractWrite(
  functionName: BankFunctionNames,
  bankAddress?: MaybeRef<Address | undefined>
) {
  const teamStore = useTeamStore()
  const resolvedAddress = computed(
    () => unref(bankAddress) ?? (teamStore.getContractAddressByType('Bank') as Address | undefined)
  )
  return useContractWritesV3({
    contractAddress: resolvedAddress,
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

export function useTransfer(bankAddress?: MaybeRef<Address | undefined>) {
  return useBankContractWrite('transfer', bankAddress)
}

export function useTransferToken(bankAddress?: MaybeRef<Address | undefined>) {
  return useBankContractWrite('transferToken', bankAddress)
}
