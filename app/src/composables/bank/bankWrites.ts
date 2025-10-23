import { computed, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores/teamStore'

export function useDepositToken(token: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'depositToken',
    args: [token, amount]
  })
}

export function useAddTokenSupport(tokenAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'addTokenSupport',
    args: [tokenAddress]
  })
}

export function useRemoveTokenSupport(tokenAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'removeTokenSupport',
    args: [tokenAddress]
  })
}

export function useClaimDividend() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'claimDividend',
    args: []
  })
}

export function useClaimTokenDividend(token: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'claimTokenDividend',
    args: [token]
  })
}

export function useDepositDividends(amount: MaybeRef<bigint>, investorAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'depositDividends',
    args: [amount, investorAddress],
    value: amount // This is a payable function
  })
}

export function useDepositTokenDividends(
  token: MaybeRef<Address>,
  amount: MaybeRef<bigint>,
  investorAddress: MaybeRef<Address>
) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'depositTokenDividends',
    args: [token, amount, investorAddress]
  })
}

export function useSetInvestorAddress(investorAddress: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'setInvestorAddress',
    args: [investorAddress]
  })
}

export function useTransfer(to: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'transfer',
    args: [to, amount]
  })
}

export function useTransferToken(
  token: MaybeRef<Address>,
  to: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'transferToken',
    args: [token, to, amount]
  })
}

export function useTransferOwnership(newOwner: MaybeRef<Address>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'transferOwnership',
    args: [newOwner]
  })
}

export function useRenounceOwnership() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'renounceOwnership',
    args: []
  })
}

export function usePause() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'pause',
    args: []
  })
}

export function useUnpause() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: 'unpause',
    args: []
  })
}
