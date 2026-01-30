import { computed, ref, watch } from 'vue'
import { useSendTransaction, useWaitForTransactionReceipt, useEstimateGas } from '@wagmi/vue'
import { getAddress, type Address } from 'viem'
import { useToastStore } from '@/stores'
import { useQueryClient } from '@tanstack/vue-query'

export interface SafeTransactionConfig {
  skipGasEstimation?: boolean
}

/**
 * A wrapper around useSendTransaction that provides transaction tracking, receipt waiting,
 * and error handling for sending ETH transactions
 */
export function useSafeSendTransaction() {
  const { addErrorToast } = useToastStore()
  const queryClient = useQueryClient()

  // Transaction params for gas estimation
  const gasEstimateParams = ref<{
    to: Address
    value: bigint
    data?: `0x${string}`
  } | null>(null)

  const {
    data: txData,
    mutateAsync,
    isPending: isSending,
    error: sendError
  } = useSendTransaction()

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError
  } = useWaitForTransactionReceipt({ hash: txData })

  // Combined loading state
  const isLoading = computed(() => isSending.value || isConfirming.value)
  const error = computed(() => sendError.value || receiptError.value)

  // Gas estimation
  const {
    data: gasEstimate,
    isLoading: isEstimatingGas,
    error: gasEstimateError,
    refetch: refetchGasEstimate
  } = useEstimateGas({
    to: computed(() => gasEstimateParams.value?.to),
    value: computed(() => gasEstimateParams.value?.value),
    data: computed(() => gasEstimateParams.value?.data),
    query: {
      enabled: computed(() => !!gasEstimateParams.value?.to && !!gasEstimateParams.value?.value)
    }
  })

  /**
   * Estimate gas for a transaction
   */
  const estimateGas = async (to: Address, value: bigint, data?: `0x${string}`) => {
    try {
      gasEstimateParams.value = { to, value, data }
      const result = await refetchGasEstimate()
      return result.data
    } catch (error) {
      console.error('Gas estimation failed:', error)
      throw error
    }
  }

  /**
   * Check if a transaction will likely succeed by estimating gas
   */
  const canExecuteTransaction = async (
    to: Address,
    value: bigint,
    data?: `0x${string}`
  ): Promise<boolean> => {
    try {
      await estimateGas(to, value, data)
      return true
    } catch (error) {
      console.warn('Transaction will likely fail:', error)
      return false
    }
  }

  // Error handling
  watch(sendError, (error) => {
    if (error) {
      console.error('Transaction send error:', error)
      // addErrorToast(`Failed to send transaction: ${parseError(error)}`)
    }
  })

  watch(receiptError, (error) => {
    if (error) {
      console.error('Transaction receipt error:', error)
      // addErrorToast(`Transaction confirmation failed: ${parseError(error)}`)
    }
  })

  // Success handling
  watch(isConfirmed, async (confirmed) => {
    if (confirmed && receipt.value) {
      console.log('Info: Transaction confirmed')
      console.log('Info: Start Invalidating queries')
      await queryClient.invalidateQueries({
        queryKey: [
          'balance',
          {
            address: receipt.value.to ? getAddress(receipt.value.to) : undefined,
            chainId: receipt.value.chainId
          }
        ]
      })
      await queryClient.invalidateQueries({
        queryKey: [
          'balance',
          {
            address: receipt.value.from ? getAddress(receipt.value.from) : undefined,
            chainId: receipt.value.chainId
          }
        ]
      })
      console.log('Info: Queries invalidation done, wait for updates')
    }
  })

  /**
   * Send a transaction and wait for confirmation
   */
  const sendTransaction = async (
    to: Address,
    value: bigint,
    data?: `0x${string}`,
    config?: SafeTransactionConfig
  ) => {
    // Optional gas estimation before sending
    if (!config?.skipGasEstimation) {
      try {
        const canExecute = await canExecuteTransaction(to, value, data)
        if (!canExecute) {
          addErrorToast('Transaction will likely fail due to insufficient gas or other constraints')
          return
        }
      } catch (gasError) {
        console.warn('Gas estimation failed, proceeding anyway:', gasError)
      }
    }

    try {
      return await mutateAsync({
        to,
        value,
        ...(data !== undefined ? { data } : {})
      })
    } catch (error) {
      console.error('Failed to send transaction:', error)
      // addErrorToast(`Failed to send transaction: ${parseError(error)}`)
      throw error
    }
  }

  /**
   * @returns {isSending} sending state
   */
  return {
    // Loading states
    isLoading,
    isSending,
    isConfirming,
    isConfirmed,

    // Data
    txData,
    receipt,
    error,

    // Gas estimation
    gasEstimate,
    isEstimatingGas,
    gasEstimateError,
    estimateGas,
    canExecuteTransaction,

    // Core function
    sendTransaction
  }
}
