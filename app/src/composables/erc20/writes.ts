import type { MaybeRef } from 'vue'
import type { Address } from 'viem'
import { ERC20_ABI as erc20Abi } from '@/artifacts/abi/erc20'
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
