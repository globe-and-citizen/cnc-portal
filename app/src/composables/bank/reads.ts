import { computed } from 'vue'
import { useTeamStore } from '@/stores'

/**
 * Bank contract address helper
 */
export function useBankAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Bank'))
}

// UNUSED — no consumers outside bank.setup.ts + tests. See commented-out
// block below for the definitions.
/*
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { BANK_ABI } from '@/artifacts/abi/bank'

const BANK_FUNCTION_NAMES = {
  PAUSED: 'paused',
  OWNER: 'owner',
  SUPPORTED_TOKENS: 'getSupportedTokens',
  BALANCE: 'getBalance'
} as const

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

export function useUnlockedBalance() {
  return useBankBalance()
}
*/
