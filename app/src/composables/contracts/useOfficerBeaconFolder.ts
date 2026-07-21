import { computed, type ComputedRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import { getAddress, isAddressEqual, zeroAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId } from '@/constant'
import { folderForOfficerBeacon, type FolderVersion } from '@/artifacts/registry'

// ERC-1967 beacon slot: bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1).
// A team's Officer is a beacon proxy; this slot holds its FactoryBeacon address,
// which the registry maps to an artifact folder (V0 / V0.1 / V1 / …).
const BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

/**
 * Resolve the artifact folder of a team's Officer from its on-chain beacon.
 * Cached per Officer address (a proxy's beacon never changes). Returns undefined
 * until resolved (or on failure). Isolated from useContractVersion so the latter
 * stays a pure computed for consumers/tests.
 */
export function useOfficerBeaconFolder(
  officerAddress: ComputedRef<string | undefined>
): ComputedRef<FolderVersion | undefined> {
  const query = useQuery({
    queryKey: computed(() => ['officer-beacon-folder', officerAddress.value]),
    enabled: computed(() => !!officerAddress.value),
    staleTime: Infinity,
    queryFn: async (): Promise<FolderVersion | null> => {
      const officer = officerAddress.value
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!officer || !client) return null
      const raw = await client.getStorageAt({ address: officer as Address, slot: BEACON_SLOT })
      if (!raw) return null
      const beacon = getAddress(`0x${raw.slice(-40)}`)
      if (isAddressEqual(beacon, zeroAddress)) return null
      return folderForOfficerBeacon(beacon, currentChainId) ?? null
    }
  })

  return computed(() => query.data.value ?? undefined)
}
