import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'

const SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES = {
  PAUSED: 'paused',
  OWNER: 'owner',
  DEPOSITS_ENABLED: 'depositsEnabled',
  SAFE_ADDRESS: 'safeAddress',
  OFFICER_ADDRESS: 'officerAddress',
  MULTIPLIER: 'multiplier',
  MIN_MULTIPLIER: 'MIN_MULTIPLIER',
  IS_TOKEN_SUPPORTED: 'isTokenSupported',
  TOKEN_DECIMALS: 'tokenDecimals',
  CALCULATE_COMPENSATION: 'calculateCompensation'
} as const

/**
 * SafeDepositRouter contract address helper
 */
export function useSafeDepositRouterAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('SafeDepositRouter'))
}

/**
 * SafeDepositRouter contract read operations
 */
export function useSafeDepositRouterPaused() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.PAUSED,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterOwner() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.OWNER,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterDepositsEnabled() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.DEPOSITS_ENABLED,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterSafeAddress() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.SAFE_ADDRESS,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterOfficerAddress() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.OFFICER_ADDRESS,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterMultiplier() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.MULTIPLIER,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterMinMultiplier() {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.MIN_MULTIPLIER,
    query: {
      enabled: !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
    }
  })
}

export function useSafeDepositRouterIsTokenSupported(tokenAddress: MaybeRef<Address>) {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()
  const tokenValue = computed(() => unref(tokenAddress))

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.IS_TOKEN_SUPPORTED,
    args: [tokenValue],
    query: {
      enabled: computed(
        () =>
          !!safeDepositRouterAddress.value &&
          isAddress(safeDepositRouterAddress.value) &&
          !!tokenValue.value &&
          isAddress(tokenValue.value)
      )
    }
  })
}

export function useSafeDepositRouterTokenDecimals(tokenAddress: MaybeRef<Address>) {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()
  const tokenValue = computed(() => unref(tokenAddress))

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.TOKEN_DECIMALS,
    args: [tokenValue],
    query: {
      enabled: computed(
        () =>
          !!safeDepositRouterAddress.value &&
          isAddress(safeDepositRouterAddress.value) &&
          !!tokenValue.value &&
          isAddress(tokenValue.value)
      )
    }
  })
}

export function useSafeDepositRouterCalculateCompensation(
  tokenAddress: MaybeRef<Address>,
  tokenAmount: MaybeRef<bigint>
) {
  const safeDepositRouterAddress = useSafeDepositRouterAddress()
  const tokenValue = computed(() => unref(tokenAddress))
  const amountValue = computed(() => unref(tokenAmount))

  return useReadContract({
    address: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.CALCULATE_COMPENSATION,
    args: [tokenValue, amountValue],
    query: {
      enabled: computed(
        () =>
          !!safeDepositRouterAddress.value &&
          isAddress(safeDepositRouterAddress.value) &&
          !!tokenValue.value &&
          isAddress(tokenValue.value) &&
          !!amountValue.value &&
          amountValue.value > 0n
      )
    }
  })
}
