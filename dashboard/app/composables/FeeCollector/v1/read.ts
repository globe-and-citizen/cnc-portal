import { useConnection, useReadContract } from '@wagmi/vue'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import type { Address } from 'viem'
import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'

// Statically bound to the V1 deployment (address + ABI). Callers import from
// this module to explicitly interact with V1; it exposes only functions that
// exist in the V1 ABI.
const { address, abi } = resolveFeeCollector('V1')

export function useFeeBalance() {
  return useReadContract({ address, abi, functionName: 'getBalance' })
}

export function useFeeTokenBalance(
  tokenAddress: Address,
  enabled?: MaybeRefOrGetter<boolean>
) {
  // `enabled` lets callers gate the read on the on-chain supported-tokens list,
  // so we don't hit `getTokenBalance` for a token the collector reverts on.
  return useReadContract({
    address,
    abi,
    functionName: 'getTokenBalance',
    args: [tokenAddress],
    query: {
      enabled: computed(() => (enabled === undefined ? true : toValue(enabled)))
    }
  })
}

export function useFeeCollectorOwner() {
  return useReadContract({ address, abi, functionName: 'owner' })
}

export function useFeeCollectorBeneficiary() {
  // Address that receives funds on withdraw(). address(0) means the contract
  // falls back to owner() when sweeping. Owner-gated setter, so we cache for the
  // session and rely on an explicit refetch() after setFeeBeneficiary succeeds.
  // V1-only function.
  return useReadContract({
    address,
    abi,
    functionName: 'feeBeneficiary',
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
  return computed(() => {
    if (!owner.value || !connection.address.value) {
      return false
    }
    return (owner.value as Address).toLowerCase() === connection.address.value.toLowerCase()
  })
}

export function useFeeConfigs() {
  return useReadContract({ address, abi, functionName: 'getAllFeeConfigs' })
}

export function useFeeSupportedTokens() {
  // On-chain list of ERC20 addresses the fee collector currently supports.
  // Owner-gated add/remove, so we treat the cached value as fresh for the
  // session and disable ambient refetch. Callers mutating the set should call
  // the returned refetch() after a successful tx. V1-only function.
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
