import type { MaybeRef } from 'vue'
import type { Address } from 'viem'
import { erc20Abi } from 'viem'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'

export function useERC20Approve(tokenAddress: MaybeRef<Address | undefined>) {
  return useContractWritesV3({
    contractAddress: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve'
  })
}

export function useERC20Transfer(tokenAddress: MaybeRef<Address | undefined>) {
  return useContractWritesV3({
    contractAddress: tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer'
  })
}
