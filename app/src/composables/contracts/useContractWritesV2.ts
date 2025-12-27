import { computed, watch, unref, type MaybeRef } from 'vue'
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from '@wagmi/vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { type Address, type Abi } from 'viem'
import { formatDataForDisplay, log, parseErrorV2, waitForCondition } from '@/utils'
import { useTransactionTimeline } from '@/composables/useTransactionTimeline'
import { simulateContract } from '@wagmi/core'
import { config as wagmiConfig } from '@/wagmi.config'

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

  const currentChainId = useChainId()

  // Use provided chainId or current account chainId
  const chainId = computed(() => unref(config.chainId) || currentChainId.value)

  const writeResult = useWriteContract()

  const receiptResult = useWaitForTransactionReceipt({
    hash: writeResult.data
  })

  // Individual computed properties for contract parameters
  const contractAddress = computed(() => unref(config.contractAddress))
  const contractAbi = computed(() => unref(config.abi))
  const contractFunctionName = computed(() => unref(config.functionName))
  const contractArgs = computed(() => unref(config.args))

  const queryKey = [
    'simulateContract',
    computed(() => ({
      address: contractAddress.value,
      functionName: contractFunctionName.value,
      args: formatDataForDisplay(contractArgs.value),
      chainId: chainId.value
    }))
  ] as const

  // Track skipGasEstimation option for conditional query enabling
  let skipGasEstimation = false

  const simulateGasResult = useQuery({
    queryKey,
    queryFn: async () => {
      if (!contractAddress.value) throw new Error('Missing contract address')

      const result = await simulateContract(wagmiConfig, {
        address: contractAddress.value,
        abi: contractAbi.value,
        functionName: contractFunctionName.value,
        args: contractArgs.value
      })

      return result
    },
    enabled: computed(() => !skipGasEstimation), // only enable if not skipping gas estimation
    refetchInterval: false, // disable the refetch
    refetchOnWindowFocus: false // optional
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
      log.error('Contract write error. \n', parseErrorV2(error))
    }
  })

  watch(receiptResult.error, (error) => {
    if (error) {
      log.error('Transaction receipt error. \n', parseErrorV2(error))
    }
  })

  /**
   * Executes a contract write operation. Wait for transaction confirmation and invalidate queries upon success.
   * @param args - Arguments to pass to the contract function (default: []).
   * @param value - Optional ETH value to send with the transaction.
   * @param options - Optional settings for the write operation (e.g., skipGasEstimation).
   * @returns The transaction response if successful, otherwise undefined.
   */
  const executeWrite = async (
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    // Store function name for query invalidation after transaction confirms
    // currentFunctionName.value = functionName
    try {
      const address = unref(config.contractAddress)
      if (!address) {
        throw new Error('Contract address is undefined')
      }

      // Set skipGasEstimation for conditional query enabling
      skipGasEstimation = !!options?.skipGasEstimation

      // Estimate gas before executing the write unless skipGasEstimation is true
      if (!skipGasEstimation) {
        await simulateGasResult.refetch()
        if (!simulateGasResult.isSuccess.value) {
          throw new Error('Gas estimation failed')
        }
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

      await waitForCondition(() => receiptResult.isSuccess.value, 15000)
      // try {
      //   await waitForCondition(() => receiptResult.isSuccess.value, 15000)
      // } catch (timeoutError) {
      //   log.error('Transaction confirmation timeout:', timeoutError)
      //   throw new Error('Transaction was sent but confirmation timed out. Please check your wallet or block explorer.')
      // }

      // Invalidate queries
      await invalidateQueries()
      return response
    } catch (error) {
      log.error(`Failed to execute ${unref(config.functionName)}: \n`, error)
      // throw error // Re-throw to allow caller to handle
    }
    return undefined
  }

  const { currentStep, timelineSteps } = useTransactionTimeline({
    writeResult,
    receiptResult,
    //@ts-expect-error -- IGNORE --
    simulateGasResult: { ...simulateGasResult, queryKey }
  })

  return {
    writeResult,
    receiptResult,
    simulateGasResult: { ...simulateGasResult, queryKey },

    // Timeline
    currentStep,
    timelineSteps,

    // Core functions
    executeWrite,
    invalidateQueries // Exposed so contract-specific implementations can override
  }
}
