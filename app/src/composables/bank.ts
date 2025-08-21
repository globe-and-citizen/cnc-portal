import { computed, ref, watch } from 'vue'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { decodeFunctionData, getContract, type Address, parseEther, isAddress } from 'viem'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'
import { useToastStore } from '@/stores'
import { useTeamStore } from '@/stores'
import BankABI from '@/artifacts/abi/bank.json'

/**
 * Valid Bank contract function names extracted from ABI
 */
export const BANK_FUNCTION_NAMES = {
  // Read functions
  PAUSED: 'paused',
  OWNER: 'owner',
  TIPS_ADDRESS: 'tipsAddress',
  IS_TOKEN_SUPPORTED: 'isTokenSupported',
  SUPPORTED_TOKENS: 'supportedTokens',

  // Write functions
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  CHANGE_TIPS_ADDRESS: 'changeTipsAddress',
  CHANGE_TOKEN_ADDRESS: 'changeTokenAddress',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  RENOUNCE_OWNERSHIP: 'renounceOwnership',
  DEPOSIT_TOKEN: 'depositToken',
  TRANSFER: 'transfer',
  TRANSFER_TOKEN: 'transferToken',
  SEND_TIP: 'sendTip',
  SEND_TOKEN_TIP: 'sendTokenTip',
  PUSH_TIP: 'pushTip',
  PUSH_TOKEN_TIP: 'pushTokenTip',
  INITIALIZE: 'initialize'
} as const

/**
 * Type for valid Bank contract function names
 */
export type BankFunctionName = typeof BANK_FUNCTION_NAMES[keyof typeof BANK_FUNCTION_NAMES]

/**
 * Validate if a function name exists in the Bank contract
 */
export function isValidBankFunction(functionName: string): functionName is BankFunctionName {
  return Object.values(BANK_FUNCTION_NAMES).includes(functionName as BankFunctionName)
}

/**
 * Legacy function - kept for backward compatibility
 */
export function useBankGetFunction(bankAddress: string) {
  const functionName = ref<string | undefined>()
  const inputs = ref<string[] | undefined>([])
  const args = ref<string[] | undefined>([])

  async function getFunction(data: string): Promise<void> {
    try {
      const bank = getContract({
        client: config.getClient(),
        address: bankAddress as Address,
        abi: BankABI
      })
      const func = decodeFunctionData({
        abi: BankABI,
        data: data as Address
      })

      functionName.value = func.functionName
      args.value = func.args as string[]
      inputs.value = bank.abi
        .find((item) => item.name === func.functionName)
        ?.inputs?.map((input) => input.name) as string[]
    } catch (error) {
      log.error(parseError(error))
    }
  }

  return { execute: getFunction, data: functionName, inputs, args }
}

/**
 * Bank contract read operations
 */
export function useBankReads() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  const isBankAddressValid = computed(() => !!bankAddress.value && isAddress(bankAddress.value))

  const useBankPaused = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: BANK_FUNCTION_NAMES.PAUSED,
      query: { enabled: isBankAddressValid } // This enable the query only if the bank address is available and valid
    })
  }

  const useBankOwner = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: BANK_FUNCTION_NAMES.OWNER,
      query: { enabled: isBankAddressValid }
    })
  }

  const useBankTipsAddress = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: BANK_FUNCTION_NAMES.TIPS_ADDRESS,
      query: { enabled: isBankAddressValid }
    })
  }

  const useBankIsTokenSupported = (tokenAddress: Address) => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: BANK_FUNCTION_NAMES.IS_TOKEN_SUPPORTED,
      args: [tokenAddress],
      query: { enabled: computed(() => !!bankAddress.value && isAddress(bankAddress.value) && isAddress(tokenAddress)) }
    })
  }

  const useBankSupportedTokens = (symbol: string) => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: BANK_FUNCTION_NAMES.SUPPORTED_TOKENS,
      args: [symbol],
      query: { enabled: computed(() => isBankAddressValid.value && !!symbol) }
    })
  }

  return {
    bankAddress,
    isBankAddressValid,
    useBankPaused,
    useBankOwner,
    useBankTipsAddress,
    useBankIsTokenSupported,
    useBankSupportedTokens
  }
}

/**
 * Bank contract write operations with comprehensive error handling
 */
export function useBankWrites() {
  const { addSuccessToast, addErrorToast } = useToastStore()
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))

  const {
    data: writeContractData,
    writeContract,
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

  watch(isConfirmed, (confirmed) => {
    if (confirmed && receipt.value) {
      addSuccessToast('Transaction confirmed successfully')
    }
  })

  const executeWrite = async (functionName: BankFunctionName, args: readonly unknown[] = [], value?: bigint) => {
    if (!bankAddress.value) {
      addErrorToast('Bank contract address not found')
      return
    }

    if (!isValidBankFunction(functionName)) {
      addErrorToast(`Invalid bank function: ${functionName}`)
      return
    }

    try {
      await writeContract({
        address: bankAddress.value,
        abi: BankABI,
        functionName,
        args,
        ...(value && { value })
      })
    } catch (error) {
      console.error(`Failed to execute ${functionName}:`, error)
      addErrorToast(`Failed to execute ${functionName}`)
    }
  }

  return {
    isLoading, // Loading state of useWriteContract
    isWritePending, // Loading state of useWriteContract & useWaitForTransactionReceipt
    isConfirming, // Loading state of useWaitForTransactionReceipt
    isConfirmed, // State of the transaction receipt 
    writeContractData, // Write contract hash
    receipt, // Receipt
    executeWrite
  }
}

/**
 * Bank contract admin functions
 */
export function useBankAdmin() {
  const writes = useBankWrites()

  const pauseContract = () => writes.executeWrite(BANK_FUNCTION_NAMES.PAUSE)
  const unpauseContract = () => writes.executeWrite(BANK_FUNCTION_NAMES.UNPAUSE)

  const changeTipsAddress = (newTipsAddress: Address) => {
    if (!isAddress(newTipsAddress)) {
      const { addErrorToast } = useToastStore()
      addErrorToast('Invalid tips address')
      return
    }
    return writes.executeWrite(BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS, [newTipsAddress])
  }

  const changeTokenAddress = (symbol: string, newTokenAddress: Address) => {
    const { addErrorToast } = useToastStore()
    if (!isAddress(newTokenAddress)) {
      addErrorToast('Invalid token address')
      return
    }
    if (!symbol.trim()) {
      addErrorToast('Token symbol is required')
      return
    }
    return writes.executeWrite(BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS, [symbol, newTokenAddress])
  }

  const transferOwnership = (newOwner: Address) => {
    if (!isAddress(newOwner)) {
      const { addErrorToast } = useToastStore()
      addErrorToast('Invalid new owner address')
      return
    }
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP, [newOwner])
  }

  const renounceOwnership = () => writes.executeWrite(BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP)

  return {
    bankAdminWrites: writes,
    pauseContract,
    unpauseContract,
    changeTipsAddress,
    changeTokenAddress,
    transferOwnership,
    renounceOwnership
  }
}

/**
 * Bank contract transfer functions
 */
export function useBankTransfers() {
  const writes = useBankWrites()
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

  const depositToken = (tokenAddress: Address, amount: string) => {
    if (!validateAddress(tokenAddress, 'token address') || !validateAmount(amount)) return
    const amountInWei = parseEther(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.DEPOSIT_TOKEN, [tokenAddress, amountInWei])
  }

  const transferEth = (to: Address, amount: string) => {
    if (!validateAddress(to, 'recipient address') || !validateAmount(amount)) return
    const amountInWei = parseEther(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER, [to, amountInWei], amountInWei)
  }

  const transferToken = (tokenAddress: Address, to: Address, amount: string) => {
    if (!validateAddress(tokenAddress, 'token address') ||
      !validateAddress(to, 'recipient address') ||
      !validateAmount(amount)) return
    const amountInWei = parseEther(amount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.TRANSFER_TOKEN, [tokenAddress, to, amountInWei])
  }

  return {
    bankTransfersWrites: writes,
    depositToken,
    transferEth,
    transferToken
  }
}


/**
 * Bank contract tipping functions
 */
export function useBankTipping() {
  const writes = useBankWrites()
  const { addErrorToast } = useToastStore()

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

  const sendEthTip = (addresses: Address[], totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount)) return
    const amountInWei = parseEther(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.SEND_TIP, [addresses, amountInWei], amountInWei)
  }

  const sendTokenTip = (addresses: Address[], tokenAddress: Address, totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount, tokenAddress)) return
    const amountInWei = parseEther(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.SEND_TOKEN_TIP, [addresses, tokenAddress, amountInWei])
  }

  const pushEthTip = (addresses: Address[], totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount)) return
    const amountInWei = parseEther(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.PUSH_TIP, [addresses, amountInWei], amountInWei)
  }

  const pushTokenTip = (addresses: Address[], tokenAddress: Address, totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount, tokenAddress)) return
    const amountInWei = parseEther(totalAmount)
    return writes.executeWrite(BANK_FUNCTION_NAMES.PUSH_TOKEN_TIP, [addresses, tokenAddress, amountInWei])
  }

  return {
    bankTippingWrites: writes,
    sendEthTip,
    sendTokenTip,
    pushEthTip,
    pushTokenTip
  }
}

/**
 * Main Bank contract composable - combines all functionality
 */
export function useBankContract() {
  const reads = useBankReads()
  const writes = useBankWrites()
  const admin = useBankAdmin()
  const transfers = useBankTransfers()
  const tipping = useBankTipping()

  return {
    ...reads,
    ...writes,
    ...admin,
    ...transfers,
    ...tipping
  }
}
