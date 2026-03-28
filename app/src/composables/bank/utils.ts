import { isAddress, type Address } from 'viem'

/**
 * Validation utilities for Bank contract operations
 */

export function useValidation() {
  const toast = useToast()

  const validateAmount = (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.add({ title: 'Invalid amount', color: 'error' })
      return false
    }
    return true
  }

  const validateAddress = (address: Address, label = 'address') => {
    if (!isAddress(address)) {
      toast.add({ title: `Invalid ${label}`, color: 'error' })
      return false
    }
    return true
  }

  return {
    validateAmount,
    validateAddress
  }
}
