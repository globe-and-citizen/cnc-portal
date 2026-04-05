import { computed, unref, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'
// import BANK_ABI from '@/artifacts/abi/Bank.json'

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

export function useDistributeNativeDividends(amount: MaybeRef<bigint>) {
  const args = computed(() => [unref(amount)] as readonly unknown[])
  return useBankContractWrite({
    functionName: 'distributeNativeDividends',
    args
  })
}
export function useDistributeTokenDividends(token: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  const args = computed(() => [unref(token), unref(amount)] as readonly unknown[])
  return useBankContractWrite({
    functionName: 'distributeTokenDividends',
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
