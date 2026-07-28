import { useConnection, useReadContract } from '@wagmi/vue'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import type { Address } from 'viem'
import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'

// Statically bound to the V0 deployment. Exposes only functions present in the
// V0 ABI — no feeBeneficiary / getSupportedTokens (those are V1-only).
const { address, abi } = resolveFeeCollector('V0')

export function useFeeBalance() {
  return useReadContract({ address, abi, functionName: 'getBalance' })
}

export function useFeeTokenBalance(
  tokenAddress: Address,
  enabled?: MaybeRefOrGetter<boolean>
) {
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
