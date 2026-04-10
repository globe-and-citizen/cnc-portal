import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address, type Hash } from 'viem'
import { useTeamStore } from '@/stores'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'

/**
 * CashRemunerationEIP712 contract address helper
 */
export function useCashRemunerationAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('CashRemunerationEIP712'))
}

export function useCashRemunerationPaused() {
  const contractAddress = useCashRemunerationAddress()

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'paused',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useCashRemunerationOwner() {
  const contractAddress = useCashRemunerationAddress()

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'owner',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useCashRemunerationOfficerAddress() {
  const contractAddress = useCashRemunerationAddress()

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'officerAddress',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useCashRemunerationBalance() {
  const contractAddress = useCashRemunerationAddress()

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'getBalance',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useCashRemunerationTokenSupport(tokenAddress: MaybeRef<Address>) {
  const contractAddress = useCashRemunerationAddress()
  const tokenAddressValue = computed(() => unref(tokenAddress))

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'supportedTokens',
    args: [tokenAddressValue.value],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value &&
          isAddress(contractAddress.value) &&
          !!tokenAddressValue.value &&
          isAddress(tokenAddressValue.value)
      )
    }
  })
}

export function useCashRemunerationSupportedTokens(tokenAddress: MaybeRef<Address>) {
  return useCashRemunerationTokenSupport(tokenAddress)
}

export function useCashRemunerationPaidWageClaim(signatureHash: MaybeRef<Hash>) {
  const contractAddress = useCashRemunerationAddress()
  const signatureHashValue = computed(() => unref(signatureHash))

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'paidWageClaims',
    args: [signatureHashValue.value],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value && isAddress(contractAddress.value) && !!signatureHashValue.value
      )
    }
  })
}

export function useCashRemunerationDisabledWageClaim(signatureHash: MaybeRef<Hash>) {
  const contractAddress = useCashRemunerationAddress()
  const signatureHashValue = computed(() => unref(signatureHash))

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'disabledWageClaims',
    args: [signatureHashValue.value],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value && isAddress(contractAddress.value) && !!signatureHashValue.value
      )
    }
  })
}

export function useCashRemunerationEip712Domain() {
  const contractAddress = useCashRemunerationAddress()

  return useReadContract({
    address: contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'eip712Domain',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}
