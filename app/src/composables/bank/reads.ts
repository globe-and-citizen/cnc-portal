import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { BANK_FUNCTION_NAMES } from './types'
import { BANK_ABI } from '@/artifacts/abi/bank'

/**
 * Bank contract address helper
 */
export function useBankAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Bank'))
}

/**
 * Bank contract read operations (mirrors the style of ERC20 reads)
 */
export function useBankPaused() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.PAUSED,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useBankOwner() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.OWNER,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useBankSupportedTokens() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.SUPPORTED_TOKENS,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useDividendBalance(address: MaybeRef<Address>) {
  const bankAddress = useBankAddress()

  const addressValue = computed(() => unref(address))

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.DIVIDEND_BALANCES,
    args: [addressValue],
    query: {
      enabled: computed(
        () => !!bankAddress.value && isAddress(bankAddress.value) && isAddress(addressValue.value)
      )
    }
  })
}

export function useTokenDividendBalance(
  tokenAddress: MaybeRef<Address>,
  address: MaybeRef<Address>
) {
  const bankAddress = useBankAddress()

  const tokenValue = computed(() => unref(tokenAddress))
  const addressValue = computed(() => unref(address))

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.TOKEN_DIVIDEND_BALANCES,
    args: [tokenValue, addressValue],
    query: {
      enabled: computed(
        () =>
          !!bankAddress.value &&
          isAddress(bankAddress.value) &&
          isAddress(tokenValue.value) &&
          isAddress(addressValue.value)
      )
    }
  })
}

export function useTotalDividend() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.TOTAL_DIVIDEND,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useUnlockedBalance() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.GET_UNLOCK_BALANCE,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}
