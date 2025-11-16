import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { ERC20_ABI } from '@/artifacts/abi/erc20'

export function useErc20Name(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: ERC20_ABI,
    functionName: 'name' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20Symbol(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: ERC20_ABI,
    functionName: 'symbol' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20Decimals(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: ERC20_ABI,
    functionName: 'decimals' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20TotalSupply(contractAddress: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  return useReadContract({
    address: erc20Address,
    abi: ERC20_ABI,
    functionName: 'totalSupply' as const,
    query: { enabled: isErc20AddressValid }
  })
}

export function useErc20BalanceOf(contractAddress: MaybeRef<Address>, account: MaybeRef<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))
  const accountValue = computed(() => unref(account))
  return useReadContract({
    address: erc20Address,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
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
    abi: ERC20_ABI,
    functionName: "allowance" as const,
    args: [ownerValue, spenderValue],
    query: {
      enabled: computed(
        () => isErc20AddressValid.value && !!ownerValue.value && !!spenderValue.value
      )
    }
  })
}
