import { type MaybeRef } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAccount } from '@wagmi/vue'
import { type Address } from 'viem'
import { ERC20_FUNCTION_NAMES, type ERC20FunctionName, isValidERC20Function } from './types'
import { useContractWrites, type ContractWriteConfig } from '../contracts/useContractWrites'
import ERC20ABI from '@/artifacts/abi/erc20.json'

/**
 * ERC20 contract specific write operations
 * This is a wrapper around the generic useContractWrites composable
 */
export function useERC20Writes(contractAddress: MaybeRef<Address>) {
  const queryClient = useQueryClient()
  const { chainId } = useAccount()

  // Use the generic contract writes composable
  const baseWrites = useContractWrites({
    contractAddress: contractAddress,
    abi: ERC20ABI,
    chainId: chainId
  } as ContractWriteConfig)

  /**
   * ERC20-specific query invalidation based on function name
   */
  const invalidateERC20Queries = async (functionName: ERC20FunctionName) => {
    if (!erc20Address.value) return

    const erc20QueryKey = {
      address: erc20Address.value,
      chainId: chainId.value
    }

    // Invalidate function-specific queries
    await queryClient.invalidateQueries({
      queryKey: [{ ...erc20QueryKey, functionName }]
    })

    // Invalidate balance queries on transfers and approvals
    if (
      functionName === ERC20_FUNCTION_NAMES.TRANSFER ||
      functionName === ERC20_FUNCTION_NAMES.TRANSFER_FROM ||
      functionName === ERC20_FUNCTION_NAMES.APPROVE
    ) {
      await queryClient.invalidateQueries({
        queryKey: [
          { ...erc20QueryKey, functionName: ERC20_FUNCTION_NAMES.BALANCE_OF }
        ]
      })

      // Also invalidate allowance queries for approvals
      if (functionName === ERC20_FUNCTION_NAMES.APPROVE) {
        await queryClient.invalidateQueries({
          queryKey: [
            { ...erc20QueryKey, functionName: ERC20_FUNCTION_NAMES.ALLOWANCE }
          ]
        })
      }
    }
  }

  /**
   * Execute a write operation with proper error handling and query invalidation
   */
  const executeWrite = async (functionName: string, args: unknown[] = []) => {
    if (!isValidERC20Function(functionName)) {
      throw new Error(`Invalid ERC20 function: ${functionName}`)
    }

    const result = await baseWrites.executeWrite(functionName, args)
    await invalidateERC20Queries(functionName)
    return result
  }

  return {
    // Re-export all base functionality
    ...baseWrites,
    executeWrite
  }
}
