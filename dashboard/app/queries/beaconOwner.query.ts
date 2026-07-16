import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { readContract } from 'viem/actions'
import { parseAbi, type Address } from 'viem'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

// Ownable — UpgradeableBeacon (and thus FactoryBeacon) exposes owner(): the
// account allowed to upgrade the beacon's implementation.
const OWNABLE_ABI = parseAbi(['function owner() view returns (address)'])

/**
 * Read the on-chain owner of a beacon (or any Ownable contract). Returns null
 * when the address is missing or the call reverts (non-Ownable target).
 */
export const useBeaconOwnerQuery = (address: MaybeRefOrGetter<string | null | undefined>) => {
  const client = useClient()

  return useQuery({
    queryKey: ['beacon-owner', { address: toValue(address) }],
    queryFn: async (): Promise<Address | null> => {
      const target = toValue(address)
      if (!target || !client.value) return null
      try {
        return await readContract(client.value, {
          address: target as Address,
          abi: OWNABLE_ABI,
          functionName: 'owner'
        })
      } catch {
        return null
      }
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5
  })
}
