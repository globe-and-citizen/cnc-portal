import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { bankAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type BankFunctionNames = WriteFunctionName<typeof bankAbi>

/**
 * A Bank other than the team's current one — used to drain a Bank belonging to
 * an archived Officer generation. Omit it and the write targets the current
 * generation, which is what every regular call site wants.
 */
export type BankAddressOverride = MaybeRefOrGetter<Address | undefined>

function useBankContractWrite<F extends BankFunctionNames>(
  functionName: F,
  address?: BankAddressOverride
) {
  const teamStore = useTeamStore()
  const bankAddress = computed(
    () => toValue(address) ?? (teamStore.getContractAddressByType('Bank') as Address | undefined)
  )
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

export function useTransfer(address?: BankAddressOverride) {
  return useBankContractWrite('transfer', address)
}

export function useTransferToken(address?: BankAddressOverride) {
  return useBankContractWrite('transferToken', address)
}

export function useFundFixedReturnRepayment() {
  return useBankContractWrite('fundFixedReturnRepayment')
}
