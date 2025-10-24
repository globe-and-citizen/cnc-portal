import { isAddress, parseEther, type Address } from 'viem'
import { useToastStore } from '@/stores'

/**
 * Validation utilities for Bank contract operations
 */

export function useValidation() {
  const { addErrorToast } = useToastStore()

  const validateAmount = (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      addErrorToast('Invalid amount')
      return false
    }
    return true
  }

  const validateAddress = (address: Address, label = 'address') => {
    if (!isAddress(address)) {
      addErrorToast(`Invalid ${label}`)
      return false
    }
    return true
  }

  return {
    validateAmount,
    validateAddress
  }
}

/**
 * Utility function to convert amount to wei
 * @deprecated Use viem's parseEther directly instead
 */
export function amountToWei(amount: string): bigint {
  return parseEther(amount)
}
