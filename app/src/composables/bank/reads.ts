import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { BANK_ABI } from '@/artifacts/abi/bank'

const BANK_FUNCTION_NAMES = {
  PAUSED: 'paused',
  OWNER: 'owner',
  SUPPORTED_TOKENS: 'getSupportedTokens',
  BALANCE: 'getBalance'
} as const

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

export function useBankBalance() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.BALANCE,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

/**
 * @deprecated Use useBankBalance instead.
 */
export function useUnlockedBalance() {
  return useBankBalance()
}
