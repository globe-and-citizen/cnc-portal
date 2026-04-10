import { useConnection, useReadContract } from '@wagmi/vue'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'
import { FEE_COLLECTOR_ABI } from '~/artifacts/abi/feeCollector'
import { FEE_COLLECTOR_ADDRESS } from '~/constant/index'

export function useFeeBalance() {
  // Native balance
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getBalance'
  })
}

export function useFeeTokenBalance(
  tokenAddress: Address,
  enabled?: MaybeRefOrGetter<boolean>
) {
  // ERC20 token balance. `enabled` lets callers gate the read on e.g. the
  // on-chain supported-tokens list, so we don't hit `getTokenBalance` for a
  // token the collector would revert on with TokenNotSupported.
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getTokenBalance',
    args: [tokenAddress],
    query: {
      enabled: computed(() => (enabled === undefined ? true : toValue(enabled)))
    }
  })
}

export function useFeeCollectorOwner() {
  // Owner address
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'owner'
  })
}

export function useFeeCollectorBeneficiary() {
  // Address that receives funds on withdraw(). address(0) means the contract
  // falls back to owner() when sweeping. Changes rarely (owner-gated setter),
  // so we cache for the whole session and rely on an explicit refetch() after
  // setFeeBeneficiary succeeds.
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
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
  // Fee configurations
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getAllFeeConfigs'
  })
}

export function useFeeSupportedTokens() {
  // On-chain list of ERC20 addresses the fee collector currently supports.
  // The supported token set changes rarely (owner-gated add/remove), so we
  // treat the cached value as fresh for the whole session and disable the
  // ambient refetch triggers. Callers that mutate the set should call the
  // returned `refetch()` after a successful tx to pick up changes.
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
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
