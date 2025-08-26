import { computed, unref, type Ref } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { ERC20_FUNCTION_NAMES } from './types'
import ERC20ABI from '@/artifacts/abi/erc20.json'

/**
 * ERC20 contract read operations
 * @param contractAddress The address of the ERC20 contract as a ref or direct value
 */
export function useERC20Reads(contractAddress: Address | Ref<Address>) {
  const erc20Address = computed(() => unref(contractAddress))
  const isErc20AddressValid = computed(() => !!erc20Address.value && isAddress(erc20Address.value))

  const useErc20Name = () => {
    return useReadContract({
      address: erc20Address.value,
      abi: ERC20ABI,
      functionName: ERC20_FUNCTION_NAMES.NAME,
      query: { enabled: isErc20AddressValid }
    })
  }

  const useErc20Symbol = () => {
    return useReadContract({
      address: erc20Address.value,
      abi: ERC20ABI,
      functionName: ERC20_FUNCTION_NAMES.SYMBOL,
      query: { enabled: isErc20AddressValid }
    })
  }

  const useErc20Decimals = () => {
    return useReadContract({
      address: erc20Address.value,
      abi: ERC20ABI,
      functionName: ERC20_FUNCTION_NAMES.DECIMALS,
      query: { enabled: isErc20AddressValid }
    })
  }

  const useErc20TotalSupply = () => {
    return useReadContract({
      address: erc20Address.value,
      abi: ERC20ABI,
      functionName: ERC20_FUNCTION_NAMES.TOTAL_SUPPLY,
      query: { enabled: isErc20AddressValid }
    })
  }

  const useErc20BalanceOf = (account: Address) => {
    return useReadContract({
      address: erc20Address.value,
      abi: ERC20ABI,
      functionName: ERC20_FUNCTION_NAMES.BALANCE_OF,
      args: [account],
      query: { enabled: isErc20AddressValid }
    })
  }

  const useErc20Allowance = (owner: Address, spender: Address) => {
    return useReadContract({
      address: erc20Address.value,
      abi: ERC20ABI,
      functionName: ERC20_FUNCTION_NAMES.ALLOWANCE,
      args: [owner, spender],
      query: { enabled: isErc20AddressValid }
    })
  }

  return {
    useErc20Name,
    useErc20Symbol,
    useErc20Decimals,
    useErc20TotalSupply,
    useErc20BalanceOf,
    useErc20Allowance
  }
}
