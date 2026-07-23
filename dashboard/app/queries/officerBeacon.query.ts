import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { getStorageAt } from 'viem/actions'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { getAddress, isAddressEqual, zeroAddress, type Address } from 'viem'

// ERC-1967 beacon storage slot: bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1).
// Every OZ BeaconProxy stores the address of its beacon here — for an Officer
// proxy that beacon IS the FactoryBeacon that deployed it.
const BEACON_SLOT
  = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

/**
 * Read the FactoryBeacon address behind an Officer beacon proxy, straight from
 * its ERC-1967 beacon slot on-chain. Returns null if the slot is empty (e.g.
 * the address isn't a beacon proxy).
 */
export const useOfficerBeaconQuery = (address: MaybeRefOrGetter<string | undefined>) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  return useQuery({
    queryKey: ['officer-beacon', { address: toValue(address) }],
    queryFn: async (): Promise<Address | null> => {
      const officer = toValue(address)
      if (!officer || !client.value) return null

      const raw = await getStorageAt(client.value, {
        address: officer as Address,
        slot: BEACON_SLOT
      })
      if (!raw) return null

      // Storage word is left-padded; the address is the low 20 bytes.
      const beacon = getAddress(`0x${raw.slice(-40)}`)
      return isAddressEqual(beacon, zeroAddress) ? null : beacon
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    staleTime: Infinity // a proxy's beacon never changes
  })
}
