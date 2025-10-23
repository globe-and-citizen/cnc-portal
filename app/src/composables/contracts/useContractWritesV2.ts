import { computed, watch, unref, type MaybeRef } from 'vue'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useEstimateGas
} from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { encodeFunctionData, type Address, type Abi } from 'viem'
// import { useToastStore } from '@/stores'
import { log, waitForCondition } from '@/utils'
import { useTransactionTimeline } from '@/composables/useTransactionTimeline'

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
  config?: {
    log?: boolean,
    toast?: boolean,
    verbose?: boolean
  }
}

/**
 * Generic contract write operations with comprehensive error handling and query invalidation
 * This base composable can be used for any contract by providing the address and ABI
 */
export function useContractWrites(config: ContractWriteConfig) {
  const queryClient = useQueryClient()
  const { chainId: currentChainId } = useAccount()

  // const { addErrorToast } = useToastStore()

  // Use provided chainId or current account chainId
  const chainId = computed(() => unref(config.chainId) || currentChainId.value)

  // Store the current function name for query invalidation
  // const currentFunctionName = ref<string | null>(null)

  const {
    // data: writeContractData,
    // isPending,
    // error: writeError


    data: writeContractData,
    error: writeError,
    isError,
    isIdle,
    isPending,
    isPaused,
    isSuccess,
    failureCount,
    failureReason,
    // mutate,
    // mutateAsync,
    writeContractAsync,
    reset,
    status,
    submittedAt,
    variables,
  } = useWriteContract()

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError
  } = useWaitForTransactionReceipt({ hash: writeContractData })

  const isLoading = computed(() => isPending.value || isConfirming.value)
  const error = computed(() => writeError.value || receiptError.value)

  // Encode the function data 
  const encodedData = computed(() => {
    let data = undefined
    try {
      data = encodeFunctionData({
        abi: unref(config.abi),
        functionName: unref(config.functionName),
        args: unref(config.args)
      })
    } catch (error) {
      log.error('Failed to encode function data:', error)
      // console.error('Failed to encode function data:', error)
    }
    return data
  })

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
      refetchInterval: false,
      enabled: false
    }
  })


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
      log.error('Contract write error:', error)
      // addErrorToast(`Transaction failed: ${parseError(error, unref(config.abi))}`)
    }
  })

  watch(receiptError, (error) => {
    if (error) {
      log.error('Transaction receipt error:', error)
      // addErrorToast(`Transaction confirmation failed: ${parseError(error, unref(config.abi))}`)
    }
  })

  /**
   * Execute a contract write operation
   */
  const executeWrite = async (
    args: readonly unknown[] = [],
    value?: bigint,
    // options?: ContractWriteOptions
  ) => {

    // Store function name for query invalidation after transaction confirms
    // currentFunctionName.value = functionName
    try {
      const address = unref(config.contractAddress)
      if (!address) {
        throw new Error('Contract address is undefined')
      }

      // Estimate gas before executing the write
      await refetchGasEstimate()
      if (!gasEstimate.value) {
        throw new Error('Gas estimation failed')
      }

      // Execute the contract write
      const response = await writeContractAsync({
        address: address,
        abi: unref(config.abi),
        functionName: unref(config.functionName),
        args,
        ...(value !== undefined ? { value } : {})
      })

      // Wait for transaction confirmation
      await waitForCondition(() => receipt.value?.status === 'success', 15000)

      // Invalidate queries
      invalidateQueries()
      return response
    } catch (error) {
      log.error(`Failed to execute ${unref(config.functionName)}:`, error)
      // addErrorToast(`Failed to execute ${unref(config.functionName)}: ${parseError(error, unref(config.abi))}`)
      // throw error
    }
    return undefined
  }

  const {
    currentStep,
    timelineSteps
  } = useTransactionTimeline({
    isEstimatingGas,
    gasEstimateError,
    gasEstimate,
    isPending,
    error,
    writeContractData,
    isConfirming,
    isConfirmed,
    receipt
  })

  return {
    writeData: {
      data: writeContractData,
      error: writeError,
      isError,
      isIdle,
      isPending,
      isPaused,
      isSuccess,
      failureCount,
      failureReason,
      reset,
      status,
      submittedAt,
      variables,
    },
    // Loading states
    isLoading,
    isPending,
    isConfirming,
    isConfirmed,

    // Data
    writeContractData,
    receipt,
    error,

    // Timeline
    currentStep,
    timelineSteps,

    // Gas estimation
    gasEstimate,
    isEstimatingGas,
    gasEstimateError,
    refetchGasEstimate,
    // estimateGas,
    // estimateGasForEncodedData,
    // canExecuteTransaction,

    // Core functions
    executeWrite,
    invalidateQueries, // Exposed so contract-specific implementations can override

    // Internal state (for advanced usage)
    // currentFunctionName: readonly(currentFunctionName)
  }
}
