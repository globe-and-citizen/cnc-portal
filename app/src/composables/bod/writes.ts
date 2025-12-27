import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { BOD_FUNCTION_NAMES, type BodFunctionName, isValidBodFunction } from './types'
import {
  useContractWrites,
  type ContractWriteConfig,
  type ContractWriteOptions
} from '../contracts/useContractWrites'
import { BOD_ABI } from '@/artifacts/abi/bod'

/**
 * BOD contract specific write operations
 * This is a wrapper around the generic useContractWrites composable
 */
export function useBodWrites() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const chainId = useChainId()
  const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))

  // Use the generic contract writes composable
  const baseWrites = useContractWrites({
    contractAddress: bodAddress.value!,
    abi: BOD_ABI,
    chainId: chainId.value
  } as ContractWriteConfig)

  /**
   * BOD-specific query invalidation based on function name
   */
  const invalidateBodQueries = async (functionName: BodFunctionName) => {
    if (!bodAddress.value) return

    const bodQueryKey = {
      address: bodAddress.value,
      chainId: chainId.value
    }

    // Invalidate queries based on the function that was called
    switch (functionName) {
      case BOD_FUNCTION_NAMES.PAUSE:
      case BOD_FUNCTION_NAMES.UNPAUSE:
        // Invalidate paused status query
        const key = {
          queryKey: [
            'readContract',
            {
              ...bodQueryKey,
              functionName: BOD_FUNCTION_NAMES.PAUSED
            }
          ]
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('try to invalidate this key', key)
        }
        await queryClient.invalidateQueries(key)
        break

      case BOD_FUNCTION_NAMES.ADD_ACTION:
        // Invalidate add action query
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bodQueryKey
            }
          ]
        })
        break

      case BOD_FUNCTION_NAMES.TRANSFER_OWNERSHIP:
      case BOD_FUNCTION_NAMES.ADD_ACTION:
      case BOD_FUNCTION_NAMES.APPROVE:
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bodQueryKey,
              functionName: BOD_FUNCTION_NAMES.IS_APPROVED
            }
          ]
        })
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bodQueryKey,
              functionName: BOD_FUNCTION_NAMES.IS_ACTION_EXECUTED
            }
          ]
        })
        break

      case BOD_FUNCTION_NAMES.REVOKE:
      case BOD_FUNCTION_NAMES.SET_BOARD_OF_DIRECTORS:

      default:
        // For any other function, invalidate all bank-related queries
        await queryClient.invalidateQueries({
          queryKey: ['readContract', bodQueryKey]
        })
        break
    }
  }

  /**
   * Execute a BOD contract write operation with validation
   */
  const executeWrite = async (
    functionName: BodFunctionName,
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    if (!isValidBodFunction(functionName)) {
      throw new Error(`Invalid BOD function: ${functionName}`)
    }

    return baseWrites.executeWrite(functionName, args, value, options)
  }

  /**
   * Estimate gas for a BOD function call
   */
  const estimateGas = async (
    functionName: BodFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ) => {
    if (!isValidBodFunction(functionName)) {
      throw new Error(`Invalid BOD function: ${functionName}`)
    }

    return baseWrites.estimateGas(functionName, args, value)
  }

  /**
   * Check if a BOD transaction will likely succeed
   */
  const canExecuteTransaction = async (
    functionName: BodFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ): Promise<boolean> => {
    if (!isValidBodFunction(functionName)) {
      return false
    }

    return baseWrites.canExecuteTransaction(functionName, args, value)
  }

  return {
    // Re-export all base functionality
    ...baseWrites,

    // Override with BOD-specific implementations
    executeWrite,
    estimateGas,
    canExecuteTransaction,
    invalidateBodQueries,

    // Keep the generic invalidateQueries as well for flexibility
    invalidateQueries: baseWrites.invalidateQueries
  }
}
