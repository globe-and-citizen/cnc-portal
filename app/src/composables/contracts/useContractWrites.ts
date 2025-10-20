import { computed, readonly, ref, watch, unref, type MaybeRef } from 'vue'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useEstimateGas
} from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { encodeFunctionData, type Address, type Abi } from 'viem'
import { useToastStore } from '@/stores'
import { parseError } from '@/utils'

export interface ContractWriteOptions {
  skipGasEstimation?: boolean
}

export interface ContractWriteConfig {
  contractAddress: MaybeRef<Address>
  abi: MaybeRef<Abi>
  chainId?: MaybeRef<number> // Optional chain ID, if not provided will use current account chain ID
}

/**
 * Generic contract write operations with comprehensive error handling and query invalidation
 * This base composable can be used for any contract by providing the address and ABI
 */
export function useContractWrites(config: ContractWriteConfig) {
  const { addSuccessToast, addErrorToast } = useToastStore()
  const queryClient = useQueryClient()
  const { chainId: currentChainId } = useAccount()

  // Use provided chainId or current account chainId
  const chainId = computed(() => unref(config.chainId) || currentChainId.value)

  // Store the current function name for query invalidation
  const currentFunctionName = ref<string | null>(null)

  const {
    data: writeContractData,
    writeContractAsync,
    isPending: isWritePending,
    error: writeError
  } = useWriteContract()

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError
  } = useWaitForTransactionReceipt({ hash: writeContractData })

  const isLoading = computed(() => isWritePending.value || isConfirming.value)
  const error = computed(() => writeError.value || receiptError.value)

  // Gas estimation state
  const gasEstimateParams = ref<{
    to: Address
    data: `0x${string}`
    value?: bigint
  } | null>(null)

  const {
    data: gasEstimate,
    isLoading: isEstimatingGas,
    error: gasEstimateError,
    refetch: refetchGasEstimate
  } = useEstimateGas({
    to: computed(() => gasEstimateParams.value?.to),
    data: computed(() => gasEstimateParams.value?.data),
    value: computed(() => gasEstimateParams.value?.value),
    query: {
      enabled: computed(() => !!gasEstimateParams.value?.to && !!gasEstimateParams.value?.data)
    }
  })

  /**
   * Estimate gas for a specific function call
   */
  const estimateGas = async (
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint
  ) => {
    try {
      // Encode the function data
      const encodedData = encodeFunctionData({
        abi: unref(config.abi),
        functionName,
        args
      })

      // Set parameters for gas estimation with encoded data
      gasEstimateParams.value = {
        to: unref(config.contractAddress),
        data: encodedData,
        value
      }

      const result = await refetchGasEstimate()
      return result.data
    } catch (error) {
      console.error(`Gas estimation failed for ${functionName}:`, error)
      throw error
    }
  }

  /**
   * Estimate gas for raw encoded function data
   */
  const estimateGasForEncodedData = async (encodedData: `0x${string}`, value?: bigint) => {
    try {
      // Set parameters for gas estimation with raw encoded data
      gasEstimateParams.value = {
        to: unref(config.contractAddress),
        data: encodedData,
        value
      }

      const result = await refetchGasEstimate()
      return result.data
    } catch (error) {
      console.error(`Gas estimation failed for encoded data:`, error)
      throw error
    }
  }

  /**
   * Check if a transaction will likely succeed by estimating gas
   */
  const canExecuteTransaction = async (
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint
  ): Promise<boolean> => {
    try {
      await estimateGas(functionName, args, value)
      return true
    } catch (error) {
      console.warn(`Transaction ${functionName} will likely fail:`, error)
      return false
    }
  }

  /**
   * Generic query invalidation function
   * This can be overridden by contract-specific implementations
   */
  const invalidateQueries = async () => {
    // Default implementation: invalidate all queries for this contract
    await queryClient.invalidateQueries({
      queryKey: [
        'readContract',
        {
          address: unref(config.contractAddress),
          chainId: chainId.value
        }
      ]
    })
  }

  // Error handling
  watch(writeError, (error) => {
    if (error) {
      console.error('Contract write error:', error)
      addErrorToast(`Transaction failed: ${parseError(error, unref(config.abi))}`)
    }
  })

  watch(receiptError, (error) => {
    if (error) {
      console.error('Transaction receipt error:', error)
      addErrorToast(`Transaction confirmation failed: ${parseError(error, unref(config.abi))}`)
    }
  })

  // Success handling with query invalidation
  watch(isConfirmed, async (confirmed) => {
    if (confirmed && receipt.value && currentFunctionName.value) {
      addSuccessToast('Transaction confirmed successfully')

      // Invalidate queries based on the function that was executed
      try {
        await invalidateQueries()
      } catch (error) {
        console.warn('Could not invalidate queries for function:', currentFunctionName.value, error)
        // Fallback: invalidate all contract queries
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              address: config.contractAddress,
              chainId: chainId.value
            }
          ]
        })
      } finally {
        // Clear the function name after processing
        currentFunctionName.value = null
      }
    }
  })

  /**
   * Execute a contract write operation
   */
  const executeWrite = async (
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    // Optional gas estimation before executing
    if (!options?.skipGasEstimation) {
      try {
        const canExecute = await canExecuteTransaction(functionName, args, value)
        if (!canExecute) {
          addErrorToast(`Transaction will likely fail due to insufficient gas or other constraints`)
          return
        }
      } catch (gasError) {
        console.warn(`Gas estimation failed for ${functionName}, proceeding anyway:`, gasError)
        // Continue with transaction even if gas estimation fails
        // TODO: check if it won't be better to not continue if gas estimation fails
      }
    }

    // Store function name for query invalidation after transaction confirms
    currentFunctionName.value = functionName
    try {
      return await writeContractAsync({
        address: unref(config.contractAddress),
        abi: unref(config.abi),
        functionName,
        args,
        ...(value !== undefined ? { value } : {})
      })
    } catch (error) {
      console.error(`Failed to execute ${functionName}:`, error)
      addErrorToast(`Failed to execute ${functionName}: ${parseError(error, unref(config.abi))}`)
      // Clear function name on error
      currentFunctionName.value = null
      throw error
    }
  }

  return {
    // Loading states
    isLoading,
    isWritePending,
    isConfirming,
    isConfirmed,

    // Data
    writeContractData,
    receipt,
    error,

    // Gas estimation
    gasEstimate,
    isEstimatingGas,
    gasEstimateError,
    estimateGas,
    estimateGasForEncodedData,
    canExecuteTransaction,

    // Core functions
    executeWrite,
    invalidateQueries, // Exposed so contract-specific implementations can override

    // Internal state (for advanced usage)
    currentFunctionName: readonly(currentFunctionName)
  }
}
