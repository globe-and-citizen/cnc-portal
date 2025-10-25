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

  const useBankSupportedTokens = () => {
    return useReadContract({
      address: bankAddress.value as Address,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.SUPPORTED_TOKENS,
      query: { enabled: computed(() => isBankAddressValid.value) }
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

  const useTokenDividendBalance = (tokenAddress: Address, address: MaybeRef<Address>) => {
    const addressValue = computed(() => unref(address))
    return useReadContract({
      address: bankAddress.value,
      abi: BANK_ABI,
      functionName: BANK_FUNCTION_NAMES.TOKEN_DIVIDEND_BALANCES,
      args: [tokenAddress, addressValue],
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

  const useUnlockedBalance = () => {
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
    useUnlockedBalance,
    useTokenDividendBalance,
    useBankPaused,
    useBankOwner,
    useBankSupportedTokens
  }
}
