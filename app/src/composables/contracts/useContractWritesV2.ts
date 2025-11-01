import { computed, watch, unref, type MaybeRef } from 'vue'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  // useEstimateGas,
  useSimulateContract
} from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { type Address, type Abi } from 'viem'
// import { useToastStore } from '@/stores'
import { log, waitForCondition } from '@/utils'
import { useTransactionTimeline } from '@/composables/useTransactionTimeline'

export interface ContractWriteOptions {
  skipGasEstimation?: boolean
}

export interface ContractWriteConfig {
  contractAddress: MaybeRef<Address | undefined>
  abi: MaybeRef<Abi>
  chainId?: MaybeRef<number> // Optional chain ID, if not provided will use current account chain ID
  functionName: MaybeRef<string>
  args: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
  config?: {
    log?: boolean
    toast?: boolean
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

  // Use provided chainId or current account chainId
  const chainId = computed(() => unref(config.chainId) || currentChainId.value)

  const writeResult = useWriteContract()

  const receiptResult = useWaitForTransactionReceipt({
    hash: writeResult.data
  })

  // Encode the function data
  // const encodedData = computed(() => {
  //   let data = undefined
  //   try {
  //     data = encodeFunctionData({
  //       abi: unref(config.abi),
  //       functionName: unref(config.functionName),
  //       args: unref(config.args)
  //     })
  //   } catch (error) {
  //     log.error('Failed to encode function data:', error)
  //     // console.error('Failed to encode function data:', error)
  //   }
  //   return data
  // })

  // const estimateGasResult = useEstimateGas({
  //   to: unref(config.contractAddress),
  //   data: encodedData,
  //   value: unref(config.value),
  //   query: {
  //     refetchOnWindowFocus: false,
  //     refetchInterval: false,
  //     enabled: false
  //   }
  // })

  const simulateGasResult = useSimulateContract({
    abi: unref(config.abi),
    address: unref(config.contractAddress),
    functionName: unref(config.functionName),
    args: unref(config.args),
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
  watch(writeResult.error, (error) => {
    if (error) {
      log.error('Contract write error:', error)
      // addErrorToast(`Transaction failed: ${parseError(error, unref(config.abi))}`)
    }
  })

  watch(receiptResult.error, (error) => {
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
    value?: bigint
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
      await simulateGasResult.refetch()
      if (!simulateGasResult.data.value) {
        throw new Error('Gas estimation failed')
      }

      // Execute the contract write
      const response = await writeResult.writeContractAsync({
        address: address,
        abi: unref(config.abi),
        functionName: unref(config.functionName),
        args,
        ...(value !== undefined ? { value } : {})
      })

      // Wait for transaction confirmation
      await waitForCondition(() => writeResult.isSuccess.value, 15000)

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

  const { currentStep, timelineSteps } = useTransactionTimeline({
    writeResult,
    receiptResult,
    simulateGasResult
  })

  return {
    writeResult,
    receiptResult,
    simulateGasResult,

    // Timeline
    currentStep,
    timelineSteps,

    // Core functions
    executeWrite,
    invalidateQueries // Exposed so contract-specific implementations can override
  }
}
