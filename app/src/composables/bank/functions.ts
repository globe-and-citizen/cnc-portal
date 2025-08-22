import { type Address } from 'viem'
import { useToastStore } from '@/stores'
import { useBankWrites } from './writes'
import { BANK_FUNCTION_NAMES } from './types'
import { useValidation, amountToWei } from './utils'

/**
 * Bank contract write functions - combines admin, transfers, and tipping
 */
export function useBankWritesFunctions() {
  const writes = useBankWrites()
  const { validateAmount, validateAddress, validateTipParams } = useValidation()
  const { addErrorToast } = useToastStore()

  // Admin functions
  const pauseContract = () => writes.executeWrite(BANK_FUNCTION_NAMES.PAUSE)
  const unpauseContract = () => writes.executeWrite(BANK_FUNCTION_NAMES.UNPAUSE)

  const changeTipsAddress = (newTipsAddress: Address) => {
    if (!validateAddress(newTipsAddress, 'tips address')) return
    return writes.executeWrite(BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS, [newTipsAddress])
  }

  const changeTokenAddress = (symbol: string, newTokenAddress: Address) => {
    if (!validateAddress(newTokenAddress, 'token address')) return
    if (!symbol.trim()) {
      addErrorToast('Token symbol is required')
      return
    }
    return writes.executeWrite(BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS, [symbol, newTokenAddress])
  }

  const transferOwnership = (newOwner: Address) => {
    if (!validateAddress(newOwner, 'new owner address')) return
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP, [newOwner])
  }

  const renounceOwnership = () => writes.executeWrite(BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP)

  // Transfer functions
  const depositToken = (tokenAddress: Address, amount: string) => {
    if (!validateAddress(tokenAddress, 'token address') || !validateAmount(amount)) return
    const amountInWei = amountToWei(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.DEPOSIT_TOKEN, [tokenAddress, amountInWei])
  }

  const transferEth = (to: Address, amount: string) => {
    if (!validateAddress(to, 'recipient address') || !validateAmount(amount)) return
    const amountInWei = amountToWei(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER, [to, amountInWei], amountInWei)
  }

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

  // Tipping functions
  const sendEthTip = (addresses: Address[], totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount)) return
    const amountInWei = amountToWei(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.SEND_TIP, [addresses, amountInWei], amountInWei)
  }

  const sendTokenTip = (addresses: Address[], tokenAddress: Address, totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount, tokenAddress)) return
    const amountInWei = amountToWei(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.SEND_TOKEN_TIP, [
      addresses,
      tokenAddress,
      amountInWei
    ])
  }

  const pushEthTip = (addresses: Address[], totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount)) return
    const amountInWei = amountToWei(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.PUSH_TIP, [addresses, amountInWei], amountInWei)
  }

  const pushTokenTip = (addresses: Address[], tokenAddress: Address, totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount, tokenAddress)) return
    const amountInWei = amountToWei(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.PUSH_TOKEN_TIP, [
      addresses,
      tokenAddress,
      amountInWei
    ])
  }

  return {
    // Write state
    ...writes,
    // Admin functions
    pauseContract,
    unpauseContract,
    changeTipsAddress,
    changeTokenAddress,
    transferOwnership,
    renounceOwnership,
    // Transfer functions
    depositToken,
    transferEth,
    transferToken,
    // Tipping functions
    sendEthTip,
    sendTokenTip,
    pushEthTip,
    pushTokenTip
  }
}
