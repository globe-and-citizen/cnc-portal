import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { BANK_FUNCTION_NAMES } from './types'
import BankABI from '@/artifacts/abi/bank.json'

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
      query: {
        enabled: computed(
          () => !!bankAddress.value && isAddress(bankAddress.value) && isAddress(tokenAddress)
        )
      }
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
