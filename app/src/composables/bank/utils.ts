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

  const validateTipParams = (addresses: Address[], amount: string, tokenAddress?: Address) => {
    if (!addresses.length) {
      addErrorToast('No recipients specified')
      return false
    }
    if (addresses.some(addr => !isAddress(addr))) {
      addErrorToast('One or more invalid addresses')
      return false
    }
    if (!amount || parseFloat(amount) <= 0) {
      addErrorToast('Invalid amount')
      return false
    }
    if (tokenAddress && !isAddress(tokenAddress)) {
      addErrorToast('Invalid token address')
      return false
    }
    return true
  }

  return {
    validateAmount,
    validateAddress,
    validateTipParams
  }
}

/**
 * Utility function to convert amount to wei
 */
export function amountToWei(amount: string): bigint {
  return parseEther(amount)
}
