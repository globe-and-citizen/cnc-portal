import { computed, unref, type MaybeRef } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAccount } from '@wagmi/vue'
import { useTeamStore, useUserDataStore } from '@/stores'

import { BANK_FUNCTION_NAMES, type BankFunctionName, isValidBankFunction } from './types'

import {
  useContractWrites,
  type ContractWriteConfig,
  type ContractWriteOptions
} from '../contracts/useContractWrites'
import { BANK_ABI } from '@/artifacts/abi/bank'

/**
 * Bank contract specific write operations
 * This is a wrapper around the generic useContractWrites composable
 */
export function useBankWrites() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const { chainId } = useAccount()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  const userDataStore = useUserDataStore()
  const userAddr = userDataStore.address as `0x${string}` | undefined
  // Use the generic contract writes composable
  const baseWrites = useContractWrites({
    contractAddress: bankAddress.value!,
    abi: BANK_ABI,
    chainId: chainId.value
  } as ContractWriteConfig)

  /**
   * Bank-specific query invalidation based on function name
   */
  const invalidateBankQueries = async (
    functionName: BankFunctionName,
    args?: readonly unknown[]
  ) => {
    if (!bankAddress.value) return

    const bankQueryKey = {
      address: bankAddress.value,
      chainId: chainId.value
    }

    // Invalidate queries based on the function that was called
    switch (functionName) {
      case BANK_FUNCTION_NAMES.PAUSE:
      case BANK_FUNCTION_NAMES.UNPAUSE:
        // Invalidate paused status query
        const key = {
          queryKey: [
            'readContract',
            {
              ...bankQueryKey,
              functionName: BANK_FUNCTION_NAMES.PAUSED
            }
          ]
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('try to invalidate this key', key)
        }
        await queryClient.invalidateQueries(key)
        break

      case BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP:
      case BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP:
        // Invalidate owner query
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bankQueryKey,
              functionName: BANK_FUNCTION_NAMES.OWNER
            }
          ]
        })
        break

      case BANK_FUNCTION_NAMES.DEPOSIT_DIVIDENDS:
        if (userAddr) {
          // precise: only the current wallet’s dividend balance
          await queryClient.invalidateQueries({
            queryKey: [
              'readContract',
              {
                ...bankQueryKey, // { address: bankAddress.value, chainId: chainId.value }
                functionName: 'dividendBalances',
                args: [userAddr] as const // mapping key
              }
            ]
          })
        }
        break

      case BANK_FUNCTION_NAMES.DEPOSIT_TOKEN_DIVIDENDS:
        if (userAddr && args?.[0]) {
          // precise: only the current wallet’s dividend balance
          await queryClient.invalidateQueries({
            queryKey: [
              'readContract',
              {
                ...bankQueryKey, // { address: bankAddress.value, chainId: chainId.value }
                functionName: 'tokenDividendBalances',
                args: [args[0], userAddr] as const // [tokenAddress, userAddress]
              }
            ]
          })
        }
        break
      case BANK_FUNCTION_NAMES.TRANSFER:
      case BANK_FUNCTION_NAMES.TRANSFER_TOKEN:
      case BANK_FUNCTION_NAMES.DEPOSIT_TOKEN:
        // Invalidate balance queries
        await queryClient.invalidateQueries({
          queryKey: ['balance', bankQueryKey]
        })
        // Also invalidate all readContract queries for this bank address
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...bankQueryKey, address: args ? args[0] : undefined }]
        })
        break
      default:
        // For any other function, invalidate all bank-related queries
        await queryClient.invalidateQueries({
          queryKey: ['readContract', bankQueryKey]
        })
        break
    }
  }

  /**
   * Execute a Bank contract write operation with validation
   */
  const executeWrite = async (
    functionName: BankFunctionName,
    args: readonly unknown[] = [],
    value?: MaybeRef<bigint>,
    options?: ContractWriteOptions
  ) => {
    if (!isValidBankFunction(functionName)) {
      throw new Error(`Invalid bank function: ${functionName}`)
    }

    const result = await baseWrites.executeWrite(
      functionName,
      args,
      value ? unref(value) : undefined,
      options
    )
    await invalidateBankQueries(functionName, args)
    return result
  }

  /**
   * Estimate gas for a Bank function call
   */
  const estimateGas = async (
    functionName: BankFunctionName,
    args: readonly unknown[] = [],
    value?: MaybeRef<bigint>
  ) => {
    if (!isValidBankFunction(functionName)) {
      throw new Error(`Invalid bank function: ${functionName}`)
    }

    return baseWrites.estimateGas(functionName, args, value ? unref(value) : undefined)
  }

  /**
   * Check if a Bank transaction will likely succeed
   */
  const canExecuteTransaction = async (
    functionName: BankFunctionName,
    args: readonly unknown[] = [],
    value?: MaybeRef<bigint>
  ): Promise<boolean> => {
    if (!isValidBankFunction(functionName)) {
      return false
    }

    return baseWrites.canExecuteTransaction(functionName, args, value ? unref(value) : undefined)
  }

  return {
    // Re-export all base functionality
    ...baseWrites,

    // Override with Bank-specific implementations
    executeWrite,
    estimateGas,
    canExecuteTransaction,
    invalidateBankQueries,

    // Keep the generic invalidateQueries as well for flexibility
    invalidateQueries: baseWrites.invalidateQueries
  }
}
