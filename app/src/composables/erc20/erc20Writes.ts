import type { MaybeRef } from 'vue'
import type { Address } from 'viem'
import { ERC20_ABI as erc20Abi } from '@/artifacts/abi/erc20'
// import { erc20Abi } from 'viem'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import type { ExtractAbiFunctionNames } from 'abitype'

type ERC20FunctionNames = ExtractAbiFunctionNames<typeof erc20Abi>

// Helper function to wrap useContractWrites for ERC20 contract
export function useERC20ContractWrite(options: {
  contractAddress: MaybeRef<Address | undefined>
  functionName: ERC20FunctionNames
  args?: Array<MaybeRef<unknown>> | MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  return useContractWrites({
    contractAddress: options.contractAddress,
    abi: erc20Abi,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useERC20Transfer(
  contractAddress: MaybeRef<Address | undefined>,
  to: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  return useERC20ContractWrite({
    contractAddress,
    functionName: 'transfer',
    args: [to, amount]
  })
}

export function useERC20TransferFrom(
  contractAddress: MaybeRef<Address | undefined>,
  from: MaybeRef<Address>,
  to: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  return useERC20ContractWrite({
    contractAddress,
    functionName: 'transferFrom',
    args: [from, to, amount]
  })
}

export function useERC20Approve(
  contractAddress: MaybeRef<Address | undefined>,
  spender: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  return useERC20ContractWrite({
    contractAddress,
    functionName: 'approve',
    args: [spender, amount]
  })
}
