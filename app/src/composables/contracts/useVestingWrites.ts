import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAccount } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { useContractWrites, type ContractWriteOptions } from './useContractWrites'
import { VESTING_ABI } from '@/artifacts/abi/vesting'

// Define Vesting function names (similar to Bank)
export const VESTING_FUNCTION_NAMES = {
  ADD_VESTING: 'addVesting',
  CANCEL_VESTING: 'cancelVesting',
  WITHDRAW: 'withdraw',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  RENOUNCE_OWNERSHIP: 'renounceOwnership'
} as const

export type VestingFunctionName =
  (typeof VESTING_FUNCTION_NAMES)[keyof typeof VESTING_FUNCTION_NAMES]

/**
 * Vesting contract specific write operations
 * Example of how to create a contract-specific wrapper around useContractWrites
 */
export function useVestingWrites() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const { chainId } = useAccount()
  const vestingAddress = computed(() => teamStore.getContractAddressByType('VestingV1'))

  // Use the generic contract writes composable
  const baseWrites = useContractWrites({
    contractAddress: vestingAddress.value!,
    abi: VESTING_ABI,
    chainId: chainId.value
  })

  /**
   * Vesting-specific query invalidation based on function name
   */
  const invalidateVestingQueries = async (functionName: VestingFunctionName) => {
    if (!vestingAddress.value) return

    const vestingQueryKey = {
      address: vestingAddress.value,
      chainId: chainId.value
    }

    // Invalidate queries based on the function that was called
    switch (functionName) {
      case VESTING_FUNCTION_NAMES.ADD_VESTING:
      case VESTING_FUNCTION_NAMES.CANCEL_VESTING:
      case VESTING_FUNCTION_NAMES.WITHDRAW:
        // Invalidate vesting-related queries
        await queryClient.invalidateQueries({
          queryKey: ['readContract', vestingQueryKey]
        })
        // Also invalidate balance queries since these affect balances
        await queryClient.invalidateQueries({
          queryKey: ['balance', vestingQueryKey]
        })
        break

      case VESTING_FUNCTION_NAMES.TRANSFER_OWNERSHIP:
      case VESTING_FUNCTION_NAMES.RENOUNCE_OWNERSHIP:
        // Invalidate owner query
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...vestingQueryKey,
              functionName: 'owner'
            }
          ]
        })
        break

      default:
        // For any other function, invalidate all vesting-related queries
        await queryClient.invalidateQueries({
          queryKey: ['readContract', vestingQueryKey]
        })
        break
    }
  }

  /**
   * Execute a Vesting contract write operation with validation
   */
  const executeWrite = async (
    functionName: VestingFunctionName,
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    // Add any Vesting-specific validation here
    return baseWrites.executeWrite(functionName, args, value, options)
  }

  /**
   * Estimate gas for a Vesting function call
   */
  const estimateGas = async (
    functionName: VestingFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ) => {
    return baseWrites.estimateGas(functionName, args, value)
  }

  /**
   * Check if a Vesting transaction will likely succeed
   */
  const canExecuteTransaction = async (
    functionName: VestingFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ): Promise<boolean> => {
    return baseWrites.canExecuteTransaction(functionName, args, value)
  }

  return {
    // Re-export all base functionality
    ...baseWrites,

    // Override with Vesting-specific implementations
    executeWrite,
    estimateGas,
    canExecuteTransaction,
    invalidateVestingQueries,

    // Keep the generic invalidateQueries as well for flexibility
    invalidateQueries: baseWrites.invalidateQueries
  }
}
