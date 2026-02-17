import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'

/**
 * SafeDepositRouter contract read operations
 */
export function useSafeDepositRouterReads(contractAddress?: MaybeRefOrGetter<Address | undefined>) {
  const teamStore = useTeamStore()

  const safeDepositRouterAddress = computed(() => {
    const providedAddress = toValue(contractAddress)
    if (providedAddress) return providedAddress

    return teamStore.getContractAddressByType('SafeDepositRouter')
  })

  const isAddressValid = computed(
    () => !!safeDepositRouterAddress.value && isAddress(safeDepositRouterAddress.value)
  )

  // Individual read contract calls
  const { data: owner, isLoading: isLoadingOwner } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'owner',
    query: { enabled: isAddressValid }
  })

  const { data: safeAddress, isLoading: isLoadingSafeAddress } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'safeAddress',
    query: { enabled: isAddressValid }
  })

  const { data: investorAddress, isLoading: isLoadingInvestorAddress } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'investorAddress',
    query: { enabled: isAddressValid }
  })

  const { data: multiplier, isLoading: isLoadingMultiplier } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'multiplier',
    query: { enabled: isAddressValid }
  })

  const { data: depositsEnabled, isLoading: isLoadingDepositsEnabled } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'depositsEnabled',
    query: { enabled: isAddressValid }
  })

  const { data: isPaused, isLoading: isLoadingPaused } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'paused',
    query: { enabled: isAddressValid }
  })

  const { data: minMultiplier, isLoading: isLoadingMinMultiplier } = useReadContract({
    address: safeDepositRouterAddress.value,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'MIN_MULTIPLIER',
    query: { enabled: isAddressValid }
  })

  // Aggregate loading state
  const isLoading = computed(
    () =>
      isLoadingOwner.value ||
      isLoadingSafeAddress.value ||
      isLoadingInvestorAddress.value ||
      isLoadingMultiplier.value ||
      isLoadingDepositsEnabled.value ||
      isLoadingPaused.value ||
      isLoadingMinMultiplier.value
  )

  // Derived states
  const canDeposit = computed(() => {
    return depositsEnabled.value === true && isPaused.value === false
  })

  const config = computed(() => {
    if (!safeAddress.value || !investorAddress.value || multiplier.value === undefined) {
      return null
    }

    return {
      safeAddress: safeAddress.value,
      investorAddress: investorAddress.value,
      multiplier: multiplier.value,
      depositsEnabled: depositsEnabled.value ?? false,
      paused: isPaused.value ?? false
    }
  })

  // Individual composable functions for specific reads
  const useSafeDepositRouterTokenSupport = (tokenAddress: Address) => {
    return useReadContract({
      address: safeDepositRouterAddress.value,
      abi: SAFE_DEPOSIT_ROUTER_ABI,
      functionName: 'supportedTokens',
      args: [tokenAddress],
      query: {
        enabled: computed(() => isAddressValid.value && isAddress(tokenAddress))
      }
    })
  }

  const useSafeDepositRouterTokenDecimals = (tokenAddress: Address) => {
    return useReadContract({
      address: safeDepositRouterAddress.value,
      abi: SAFE_DEPOSIT_ROUTER_ABI,
      functionName: 'tokenDecimals',
      args: [tokenAddress],
      query: {
        enabled: computed(() => isAddressValid.value && isAddress(tokenAddress))
      }
    })
  }

  const useSafeDepositRouterCalculateCompensation = (tokenAddress: Address, amount: bigint) => {
    return useReadContract({
      address: safeDepositRouterAddress.value,
      abi: SAFE_DEPOSIT_ROUTER_ABI,
      functionName: 'calculateCompensation',
      args: [tokenAddress, amount],
      query: {
        enabled: computed(() => isAddressValid.value && isAddress(tokenAddress) && amount > 0n)
      }
    })
  }

  return {
    // Address
    safeDepositRouterAddress,
    isAddressValid,

    // Raw values
    owner,
    safeAddress,
    investorAddress,
    multiplier,
    depositsEnabled,
    isPaused,
    minMultiplier,

    // Derived states
    canDeposit,
    config,

    // Loading state
    isLoading,

    // Composable functions for dynamic reads
    useSafeDepositRouterTokenSupport,
    useSafeDepositRouterTokenDecimals,
    useSafeDepositRouterCalculateCompensation
  }
}
