import { computed, ref, watch } from 'vue'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useToastStore } from '@/stores'
import { useTeamStore } from '@/stores'
import { parseError } from '@/utils'
import { BANK_FUNCTION_NAMES, type BankFunctionName, isValidBankFunction } from './types'
import BankABI from '@/artifacts/abi/bank.json'

/**
 * Bank contract write operations with comprehensive error handling and query invalidation
 */
export function useBankWrites() {
  const { addSuccessToast, addErrorToast } = useToastStore()
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const { chainId } = useAccount()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))

  // Store the current function name for query invalidation
  const currentFunctionName = ref<BankFunctionName | null>(null)

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

  /**
   * Invalidate specific Bank contract queries after successful transactions
   */
  const invalidateBankQueries = async (functionName: BankFunctionName) => {
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
          console.log("try to invalidate this key", key)
        }
        await queryClient.invalidateQueries(key)
        break

      case BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS:
        // Invalidate tips address query
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bankQueryKey,
              functionName: BANK_FUNCTION_NAMES.TIPS_ADDRESS
            }
          ]
        })
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

      case BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS:
        // Invalidate all token-related queries
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bankQueryKey,
              functionName: BANK_FUNCTION_NAMES.IS_TOKEN_SUPPORTED
            }
          ]
        })
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              ...bankQueryKey,
              functionName: BANK_FUNCTION_NAMES.SUPPORTED_TOKENS
            }
          ]
        })
        break

      case BANK_FUNCTION_NAMES.TRANSFER:
      case BANK_FUNCTION_NAMES.TRANSFER_TOKEN:
      case BANK_FUNCTION_NAMES.SEND_TIP:
      case BANK_FUNCTION_NAMES.SEND_TOKEN_TIP:
      case BANK_FUNCTION_NAMES.PUSH_TIP:
      case BANK_FUNCTION_NAMES.PUSH_TOKEN_TIP:
      case BANK_FUNCTION_NAMES.DEPOSIT_TOKEN:
        // Invalidate balance queries
        await queryClient.invalidateQueries({
          queryKey: [
            'balance',
            bankQueryKey
          ]
        })
        // Also invalidate all readContract queries for this bank address
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            bankQueryKey
          ]
        })
        break

      default:
        // For any other function, invalidate all bank-related queries
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            bankQueryKey
          ]
        })
        break
    }
  }

  // Error handling
  watch(writeError, (error) => {
    if (error) {
      console.error('Bank contract write error:', error)
      addErrorToast(`Transaction failed: ${parseError(error)}`)
    }
  })

  watch(receiptError, (error) => {
    if (error) {
      console.error('Bank transaction receipt error:', error)
      addErrorToast(`Transaction confirmation failed: ${parseError(error)}`)
    }
  })

  // Success handling with query invalidation
  watch(isConfirmed, async (confirmed) => {
    if (confirmed && receipt.value && currentFunctionName.value) {
      addSuccessToast('Transaction confirmed successfully')

      // Invalidate queries based on the function that was executed
      try {
        await invalidateBankQueries(currentFunctionName.value)
      } catch (error) {
        console.warn('Could not invalidate queries for function:', currentFunctionName.value, error)
        // Fallback: invalidate all bank queries
        if (bankAddress.value) {
          await queryClient.invalidateQueries({
            queryKey: [
              'readContract',
              {
                address: bankAddress.value,
                chainId: chainId.value
              }
            ]
          })
        }
      } finally {
        // Clear the function name after processing
        currentFunctionName.value = null
      }
    }
  })

  const executeWrite = async (
    functionName: BankFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ) => {
    if (!bankAddress.value) {
      addErrorToast('Bank contract address not found')
      return
    }

    if (!isValidBankFunction(functionName)) {
      addErrorToast(`Invalid bank function: ${functionName}`)
      return
    }

    // Store function name for query invalidation after transaction confirms
    currentFunctionName.value = functionName

    try {
      await writeContractAsync({
        address: bankAddress.value,
        abi: BankABI,
        functionName,
        args,
        ...(value !== undefined ? { value } : {})
      })
    } catch (error) {
      console.error(`Failed to execute ${functionName}:`, error)
      addErrorToast(`Failed to execute ${functionName}: ${parseError(error)}`)
      // Clear function name on error
      currentFunctionName.value = null
    }
  }

  return {
    isLoading, // Combined loading state of useWriteContract and useWaitForTransactionReceipt
    isWritePending, // Pending state from useWriteContract
    isConfirming, // Loading state of useWaitForTransactionReceipt
    isConfirmed, // State of the transaction receipt 
    writeContractData, // Write contract hash
    receipt, // Receipt
    error, // Combined error from write contract and transaction receipt
    executeWrite,
    invalidateBankQueries // Expose for manual invalidation if needed
  }
}
