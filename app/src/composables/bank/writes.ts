import { computed, unref, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type BankFunctionNames = ExtractAbiFunctionNames<typeof BANK_ABI>

// Helper function to wrap useContractWrites for Bank contract
export function useBankContractWrite(options: {
  functionName: BankFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useDepositToken(token: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  const args = computed(() => [unref(token), unref(amount)] as readonly unknown[])

  return useBankContractWrite({
    functionName: 'depositToken',
    args
  })
}

export function useAddTokenSupport(tokenAddress: MaybeRef<Address>) {
  return useBankContractWrite({
    functionName: 'addTokenSupport',
    args: [tokenAddress]
  })
}

export function useRemoveTokenSupport(tokenAddress: MaybeRef<Address>) {
  return useBankContractWrite({
    functionName: 'removeTokenSupport',
    args: [tokenAddress]
  })
}

export function useClaimDividend() {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  
  const writeResult = useBankContractWrite({
    functionName: 'claimDividend',
    args: []
  })

  // Override invalidateQueries to invalidate dividend balances
  const originalInvalidateQueries = writeResult.invalidateQueries
  writeResult.invalidateQueries = async () => {
    await originalInvalidateQueries()
    // Invalidate all dividend balances queries for this bank
    await queryClient.invalidateQueries({
      queryKey: ['bank', 'dividendBalances', bankAddress.value]
    })
  }

  return writeResult
}

export function useClaimTokenDividend(token: MaybeRef<Address>) {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))

  const args = computed(() => [unref(token)] as readonly unknown[])
  
  const writeResult = useBankContractWrite({
    functionName: 'claimTokenDividend',
    args
  })

  // Override invalidateQueries to invalidate dividend balances
  const originalInvalidateQueries = writeResult.invalidateQueries
  writeResult.invalidateQueries = async () => {
    await originalInvalidateQueries()
    // Invalidate all dividend balances queries for this bank
    await queryClient.invalidateQueries({
      queryKey: ['bank', 'dividendBalances', bankAddress.value]
    })
  }

  return writeResult
}

export function useDepositDividends(amount: MaybeRef<bigint>, investorAddress: MaybeRef<Address>) {
  const args = computed(() => [unref(amount), unref(investorAddress)] as readonly unknown[])
  return useBankContractWrite({
    functionName: 'depositDividends',
    args,
    value: amount // This is a payable function
  })
}

export function useDepositTokenDividends(
  token: MaybeRef<Address>,
  amount: MaybeRef<bigint>,
  investorAddress: MaybeRef<Address>
) {
  const args = computed(() => [unref(token), unref(amount), unref(investorAddress)] as readonly unknown[])
  return useBankContractWrite({
    functionName: 'depositTokenDividends',
    args
  })
}

export function useSetInvestorAddress(investorAddress: MaybeRef<Address>) {
  return useBankContractWrite({
    functionName: 'setInvestorAddress',
    args: [investorAddress]
  })
}

export function useTransfer(to: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  return useBankContractWrite({
    functionName: 'transfer',
    args: [to, amount]
  })
}

export function useTransferToken(
  token: MaybeRef<Address>,
  to: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  return useBankContractWrite({
    functionName: 'transferToken',
    args: [token, to, amount]
  })
}

export function useTransferOwnership(newOwner: MaybeRef<Address>) {
  return useBankContractWrite({
    functionName: 'transferOwnership',
    args: [newOwner]
  })
}

export function useRenounceOwnership() {
  return useBankContractWrite({
    functionName: 'renounceOwnership',
    args: []
  })
}

export function usePause() {
  return useBankContractWrite({
    functionName: 'pause',
    args: []
  })
}

export function useUnpause() {
  return useBankContractWrite({
    functionName: 'unpause',
    args: []
  })
}
