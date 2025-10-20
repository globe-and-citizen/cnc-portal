import { type Address } from 'viem'
import { useToastStore } from '@/stores'
import { useBankWrites } from './writes'
import { BANK_FUNCTION_NAMES } from './types'
import { useValidation, amountToWei } from './utils'
import { computed, unref } from 'vue'

/**
 * Bank contract write functions - combines admin and transfers
 *
 * @returns {object} All bank write state and functions:
 *   - ...writes: underlying write state and helpers
 *   - pauseContract, unpauseContract: admin pause/unpause
 *   - transferOwnership, renounceOwnership: admin ownership functions
 *   - depositToken, transferEth, transferToken: transfer functions
 */
export function useBankWritesFunctions() {
  const writes = useBankWrites()
  const { validateAmount, validateAddress } = useValidation()

  const bankFunctionName =
    'value' in writes.currentFunctionName
      ? writes.currentFunctionName
      : computed(() => unref(writes.currentFunctionName))

  const isBankLoading =
    'value' in writes.isLoading ? writes.isLoading : computed(() => unref(writes.isLoading))

  const isBankConfirmed =
    'value' in writes.isConfirmed ? writes.isConfirmed : computed(() => unref(writes.isConfirmed))

  // Admin functions
  const pauseContract = () => writes.executeWrite(BANK_FUNCTION_NAMES.PAUSE)
  const unpauseContract = () => writes.executeWrite(BANK_FUNCTION_NAMES.UNPAUSE)

  const transferOwnership = (newOwner: Address) => {
    if (!validateAddress(newOwner, 'new owner address')) return
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP, [newOwner])
  }

  const renounceOwnership = () => writes.executeWrite(BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP)

  // Transfer functions
  const depositToken = (tokenAddress: Address, amount: string) => {
    if (!validateAddress(tokenAddress, 'token address') || !validateAmount(amount)) return

    return writes.executeWrite(BANK_FUNCTION_NAMES.DEPOSIT_TOKEN, [
      tokenAddress,
      BigInt(Number(amount) * 1e6)
    ])
  }

  const transferEth = (to: Address, amount: string) => {
    if (!validateAddress(to, 'recipient address') || !validateAmount(amount)) return
    const amountInWei = amountToWei(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER, [to, amountInWei])
  }

  /**
   * @description Transfers a specified amount of tokens from one address to another.
   */

  const transferToken = (tokenAddress: Address, to: Address, amount: string) => {
    if (
      !validateAddress(tokenAddress, 'token address') ||
      !validateAddress(to, 'recipient address') ||
      !validateAmount(amount)
    )
      return
    const amountInWei = amountToWei(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER_TOKEN, [tokenAddress, to, amountInWei])
  }

  const depositDividends = (amount: string, investorAddress: Address) => {
    //if (!validateAmount(amount)) return
    // const amountInWei = amountToWei(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.DEPOSIT_DIVIDENDS, [amount, investorAddress])
  }

  const claimDividend = () => {
    return writes.executeWrite(BANK_FUNCTION_NAMES.CLAIM_DIVIDEND)
  }

  const setInvestorAddress = (investorAddress: Address) => {
    if (!validateAddress(investorAddress, 'investor address')) return
    return writes.executeWrite(BANK_FUNCTION_NAMES.SET_INVESTOR_ADDRESS, [investorAddress])
  }

  return {
    // Write state
    ...writes,
    // Admin functions
    pauseContract,
    unpauseContract,
    transferOwnership,
    renounceOwnership,
    // Transfer functions
    depositToken,
    transferEth,
    transferToken,
    depositDividends,
    claimDividend,
    setInvestorAddress,
    bankFunctionName,
    isBankLoading,
    isBankConfirmed
  }
}
