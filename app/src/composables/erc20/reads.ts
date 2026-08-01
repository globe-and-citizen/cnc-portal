import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { erc20Abi, isAddress, type Address } from 'viem'

export function useErc20BalanceOf(contractAddress: MaybeRef<Address>, account: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  const accountValue = computed(() => unref(account))
  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'balanceOf' as const,
    args: [accountValue],
    query: { enabled: computed(() => isErc20AddressValid.value && !!accountValue.value) }
  })
}

export function useErc20Allowance(
  contractAddress: MaybeRef<Address>,
  owner: MaybeRef<Address>,
  spender: MaybeRef<Address>
) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  const ownerValue = computed(() => unref(owner))
  const spenderValue = computed(() => unref(spender))

  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'allowance' as const,
    args: [ownerValue, spenderValue],
    query: {
      enabled: computed(
        () => isErc20AddressValid.value && !!ownerValue.value && !!spenderValue.value
      ),
      refetchInterval: 300000
    }
  })
}

// UNUSED — no consumers outside erc20.setup.ts. See the commented-out block for
// useErc20Name, useErc20Symbol, useErc20Decimals, useErc20TotalSupply.
/*
export function useErc20Name(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'name' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20Symbol(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'symbol' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20Decimals(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'decimals' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20TotalSupply(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'totalSupply' as const,
    query: { enabled: isErc20AddressValid }
  })
}
*/
