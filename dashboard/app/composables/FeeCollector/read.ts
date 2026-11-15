import { useConnection, useReadContract } from '@wagmi/vue'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { resolveManagedFeeCollector } from './resolveManagedFeeCollector'

// These functions bind to the mounted V1/V2 panel's selected deployment. The
// panel is keyed by version, so switching versions recreates every query.
export function useFeeBalance() {
  const { address, abi } = resolveManagedFeeCollector()
  return useReadContract({ address, abi, functionName: 'getBalance' })
}

export function useFeeTokenBalance(tokenAddress: Address, enabled?: MaybeRefOrGetter<boolean>) {
  const { address, abi } = resolveManagedFeeCollector()
  return useReadContract({
    address,
    abi,
    functionName: 'getTokenBalance',
    args: [tokenAddress],
    query: { enabled: computed(() => enabled === undefined ? true : toValue(enabled)) }
  })
}

export function useFeeCollectorOwner() {
  const { address, abi } = resolveManagedFeeCollector()
  return useReadContract({ address, abi, functionName: 'owner' })
}

export function useFeeCollectorBeneficiary() {
  const { address, abi, version } = resolveManagedFeeCollector()
  return useReadContract({
    address,
    abi,
    functionName: version === 'V2' ? 'getFeeBeneficiary' : 'feeBeneficiary',
    query: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  })
}

export function isFeeCollectorOwner() {
  const connection = useConnection()
  const { data: owner } = useFeeCollectorOwner()
  return computed(() => !!owner.value && !!connection.address.value
    && (owner.value as Address).toLowerCase() === connection.address.value.toLowerCase())
}

export function useFeeConfigs() {
  const { address, abi } = resolveManagedFeeCollector()
  return useReadContract({ address, abi, functionName: 'getAllFeeConfigs' })
}

export function useFeeSupportedTokens() {
  const { address, abi } = resolveManagedFeeCollector()
  return useReadContract({
    address,
    abi,
    functionName: 'getSupportedTokens',
    query: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  })
}
