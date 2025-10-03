import { isAddress, type Address } from 'viem'
import { useToastStore } from '@/stores'

/**
 * Validation utilities for ERC20 contract operations
 */
export function useValidation() {
  const { addErrorToast } = useToastStore()

  const validateAddress = (address: Address | undefined, label: string) => {
    if (!address || !isAddress(address)) {
      addErrorToast(`Invalid ${label}`)
      return false
    }
    return true
  }

  const validateAmount = (amount: bigint | undefined) => {
    if (!amount || amount <= 0n) {
      addErrorToast('Invalid amount')
      return false
    }
    return true
  }

  return {
    validateAddress,
    validateAmount
  }
}
