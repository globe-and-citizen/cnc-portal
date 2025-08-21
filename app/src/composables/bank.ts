import { computed, ref, watch } from 'vue'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { decodeFunctionData, getContract, type Address, parseEther, isAddress } from 'viem'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'
import { useToastStore } from '@/stores'
import { useTeamStore } from '@/stores'
import BankABI from '@/artifacts/abi/bank.json'

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
      functionName: 'paused',
      query: { enabled: isBankAddressValid } // This enable the query only if the bank address is available and valid
    })
  }

  const useBankOwner = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: 'owner',
      query: { enabled: isBankAddressValid }
    })
  }

  const useBankTipsAddress = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: 'tipsAddress',
      query: { enabled: isBankAddressValid }
    })
  }

  const useBankIsTokenSupported = (tokenAddress: Address) => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: 'isTokenSupported',
      args: [tokenAddress],
      query: { enabled: computed(() => !!bankAddress.value && isAddress(bankAddress.value) && isAddress(tokenAddress)) }
    })
  }

  const useBankSupportedTokens = (symbol: string) => {
    return useReadContract({
      address: bankAddress.value,
      abi: BankABI,
      functionName: 'supportedTokens',
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

  const executeWrite = async (functionName: string, args: readonly unknown[] = [], value?: bigint) => {
    if (!bankAddress.value) {
      addErrorToast('Bank contract address not found')
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
    bankAddress,
    isLoading,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeContractData,
    receipt,
    executeWrite
  }
}

/**
 * Bank contract admin functions
 */
export function useBankAdmin() {
  const { executeWrite } = useBankWrites()

  const pauseContract = () => executeWrite('pause')
  const unpauseContract = () => executeWrite('unpause')
  
  const changeTipsAddress = (newTipsAddress: Address) => {
    if (!isAddress(newTipsAddress)) {
      const { addErrorToast } = useToastStore()
      addErrorToast('Invalid tips address')
      return
    }
    return executeWrite('changeTipsAddress', [newTipsAddress])
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
    return executeWrite('changeTokenAddress', [symbol, newTokenAddress])
  }

  const transferOwnership = (newOwner: Address) => {
    if (!isAddress(newOwner)) {
      const { addErrorToast } = useToastStore()
      addErrorToast('Invalid new owner address')
      return
    }
    return executeWrite('transferOwnership', [newOwner])
  }

  const renounceOwnership = () => executeWrite('renounceOwnership')

  return {
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
  const { executeWrite } = useBankWrites()
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
    return executeWrite('depositToken', [tokenAddress, amountInWei])
  }

  const transferEth = (to: Address, amount: string) => {
    if (!validateAddress(to, 'recipient address') || !validateAmount(amount)) return
    const amountInWei = parseEther(amount)
    return executeWrite('transfer', [to, amountInWei], amountInWei)
  }

  const transferToken = (tokenAddress: Address, to: Address, amount: string) => {
    if (!validateAddress(tokenAddress, 'token address') || 
        !validateAddress(to, 'recipient address') || 
        !validateAmount(amount)) return
    const amountInWei = parseEther(amount)
    return executeWrite('transferToken', [tokenAddress, to, amountInWei])
  }

  return { depositToken, transferEth, transferToken }
}

/**
 * Bank contract tipping functions
 */
export function useBankTipping() {
  const { executeWrite } = useBankWrites()
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
    return executeWrite('sendTip', [addresses, amountInWei], amountInWei)
  }

  const sendTokenTip = (addresses: Address[], tokenAddress: Address, totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount, tokenAddress)) return
    const amountInWei = parseEther(totalAmount)
    return executeWrite('sendTokenTip', [addresses, tokenAddress, amountInWei])
  }

  const pushEthTip = (addresses: Address[], totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount)) return
    const amountInWei = parseEther(totalAmount)
    return executeWrite('pushTip', [addresses, amountInWei], amountInWei)
  }

  const pushTokenTip = (addresses: Address[], tokenAddress: Address, totalAmount: string) => {
    if (!validateTipParams(addresses, totalAmount, tokenAddress)) return
    const amountInWei = parseEther(totalAmount)
    return executeWrite('pushTokenTip', [addresses, tokenAddress, amountInWei])
  }

  return { sendEthTip, sendTokenTip, pushEthTip, pushTokenTip }
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
