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
import { parseError, waitForCondition } from '@/utils'

export interface ContractWriteOptions {
  skipGasEstimation?: boolean
}

export interface ContractWriteConfig {
  contractAddress: MaybeRef<Address | undefined>
  abi: MaybeRef<Abi>
  chainId?: MaybeRef<number>,// Optional chain ID, if not provided will use current account chain ID
  functionName: MaybeRef<string>,
  args: MaybeRef<readonly unknown[]>,
  value?: MaybeRef<bigint>
}

/**
 * Generic contract write operations with comprehensive error handling and query invalidation
 * This base composable can be used for any contract by providing the address and ABI
 */
export function useContractWrites(config: ContractWriteConfig) {
  const queryClient = useQueryClient()
  const { chainId: currentChainId } = useAccount()

  const { addSuccessToast, addErrorToast } = useToastStore()

  // Use provided chainId or current account chainId
  const chainId = computed(() => unref(config.chainId) || currentChainId.value)

  // Store the current function name for query invalidation
  // const currentFunctionName = ref<string | null>(null)

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
  // const gasEstimateParams = ref<{
  //   to: Address
  //   data: `0x${string}`
  //   value?: bigint
  // } | null>(null)

  // TODO encodeFunctionData can throw an error, need to handle that
  // Encode the function data 
  const encodedData = computed(() => encodeFunctionData({
    abi: unref(config.abi),
    functionName: unref(config.functionName),
    args: unref(config.args)
  }))

  const {
    data: gasEstimate,
    isLoading: isEstimatingGas,
    error: gasEstimateError,
    refetch: refetchGasEstimate
  } = useEstimateGas({
    to: unref(config.contractAddress),
    data: encodedData,
    value: unref(config.value),
    query: {
      refetchOnWindowFocus: false,
      enabled: computed(() => !!unref(config.contractAddress) && !!encodedData.value)
    }
  })


  /**
   * Check if a transaction will likely succeed by estimating gas
   */
  const canExecuteTransaction = async (
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint
  ): Promise<boolean> => {
    const result = await refetchGasEstimate()
    return !!result.data
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
  // watch(isConfirmed, async (confirmed) => {
  //   if (confirmed && receipt.value && currentFunctionName.value) {
  //     addSuccessToast('Transaction confirmed successfully')

  //     // Invalidate queries based on the function that was executed
  //     try {
  //       await invalidateQueries()
  //     } catch (error) {
  //       console.warn('Could not invalidate queries for function:', currentFunctionName.value, error)
  //       // Fallback: invalidate all contract queries
  //       await queryClient.invalidateQueries({
  //         queryKey: [
  //           'readContract',
  //           {
  //             address: config.contractAddress,
  //             chainId: chainId.value
  //           }
  //         ]
  //       })
  //     } finally {
  //       // Clear the function name after processing
  //       currentFunctionName.value = null
  //     }
  //   }
  // })

  /**
   * Execute a contract write operation
   */
  const executeWrite = async (
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    // Optional gas estimation before executing
    // if (!options?.skipGasEstimation) {
    //   try {
    //     const canExecute = await canExecuteTransaction(functionName, args, value)
    //     if (!canExecute) {
    //       addErrorToast(`Transaction will likely fail due to insufficient gas or other constraints`)
    //       return
    //     }
    //   } catch (gasError) {
    //     console.warn(`Gas estimation failed for ${functionName}, proceeding anyway:`, gasError)
    //     // Continue with transaction even if gas estimation fails
    //     // TODO: check if it won't be better to not continue if gas estimation fails
    //   }
    // }

    // Store function name for query invalidation after transaction confirms
    // currentFunctionName.value = functionName
    try {
      // I don't think this can throw an error, there is no need to wrap it in try/catch
      await refetchGasEstimate()
      const response = await writeContractAsync({
        address: unref(config.contractAddress),
        abi: unref(config.abi),
        functionName: unref(config.functionName),
        args,
        ...(value !== undefined ? { value } : {})
      })
      await waitForCondition(() => receipt.value?.status === 'success', 15000)
      return response
    } catch (error) {
      console.error(`Failed to execute ${unref(config.functionName)}:`, error)
      addErrorToast(`Failed to execute ${unref(config.functionName)}: ${parseError(error, unref(config.abi))}`)
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
    refetchGasEstimate,
    // estimateGas,
    // estimateGasForEncodedData,
    canExecuteTransaction,

    // Core functions
    executeWrite,
    invalidateQueries, // Exposed so contract-specific implementations can override

    // Internal state (for advanced usage)
    // currentFunctionName: readonly(currentFunctionName)
  }
}
