import { type Address, isAddress } from 'viem'
import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { useChainId, useReadContract } from '@wagmi/vue'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'

/** Shared Ownable read, using the standard address/chain cache and invalidation. */
export function useContractOwner(address: MaybeRefOrGetter<Address | undefined>) {
  const contractAddress = computed(() => toValue(address))
  const chainId = useChainId()
  return useReadContract(
    computed(() => ({
      address: contractAddress.value,
      chainId: chainId.value,
      abi: ownablePausableAbi,
      functionName: 'owner' as const,
      query: {
        enabled: !!contractAddress.value && isAddress(contractAddress.value)
      }
    }))
  )
}
