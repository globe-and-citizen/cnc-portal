import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { BANK_FUNCTION_NAMES } from './types'
import { BANK_ABI } from '@/artifacts/abi/bank'

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
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.PAUSED,
      query: { enabled: isBankAddressValid } // This enable the query only if the bank address is available and valid
    })
  }

  const useBankOwner = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.OWNER,
      query: { enabled: isBankAddressValid }
    })
  }

  const useBankTipsAddress = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.TIPS_ADDRESS,
      query: { enabled: isBankAddressValid }
    })
  }

  const useBankIsTokenSupported = (tokenAddress: MaybeRef<Address>) => {
    const tokenAddressValue = computed(() => unref(tokenAddress))
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.IS_TOKEN_SUPPORTED,
      args: [tokenAddressValue],
      query: {
        enabled: computed(
          () =>
            !!bankAddress.value &&
            isAddress(bankAddress.value) &&
            isAddress(tokenAddressValue.value)
        )
      }
    })
  }

  const useBankSupportedTokens = (symbol: MaybeRef<string>) => {
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.SUPPORTED_TOKENS,
      args: [unref(symbol)],
      query: { enabled: computed(() => isBankAddressValid.value && !!unref(symbol)) }
    })
  }

  const useDividendBalance = (address: MaybeRef<Address>) => {
    const addressValue = computed(() => unref(address))
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.DIVIDEND_BALANCES,
      args: [addressValue],
      query: {
        enabled: computed(() => isBankAddressValid.value && isAddress(addressValue.value))
      }
    })
  }

  const useTotalDividend = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.TOTAL_DIVIDEND,
      query: { enabled: isBankAddressValid }
    })
  }

  const useUnlockBalance = () => {
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.GET_UNLOCK_BALANCE,
      query: { enabled: isBankAddressValid }
    })
  }

  return {
    bankAddress,
    isBankAddressValid,
    useDividendBalance,
    useTotalDividend,
    useUnlockBalance,
    useBankPaused,
    useBankOwner,
    useBankTipsAddress,
    useBankIsTokenSupported,
    useBankSupportedTokens
  }
}
