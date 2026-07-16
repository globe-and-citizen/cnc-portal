import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { getStorageAt, readContract } from 'viem/actions'
import { getAddress, isAddressEqual, parseAbi, zeroAddress, type Address } from 'viem'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

// Ownable — UpgradeableBeacon and OZ ProxyAdmin both expose owner().
const OWNABLE_ABI = parseAbi(['function owner() view returns (address)'])

// ERC-1967 admin slot: bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1).
// A TransparentUpgradeableProxy stores its ProxyAdmin address here.
const ADMIN_SLOT
  = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'

const readOwner = async (
  client: NonNullable<ReturnType<typeof useClient>['value']>,
  address: Address
): Promise<Address | null> => {
  try {
    return await readContract(client, {
      address,
      abi: OWNABLE_ABI,
      functionName: 'owner'
    })
  } catch {
    return null
  }
}

/**
 * Resolve the upgrade authority of a contract generation:
 *  - Beacon proxy      → the beacon's owner().
 *  - Transparent proxy → the ProxyAdmin (from the ERC-1967 admin slot) owner().
 *
 * Pass the beacon address when there is one, otherwise the proxy address (which
 * for transparent-proxy contracts is the registry's "implementation" entry).
 */
export const useUpgradeOwnerQuery = (
  beacon: MaybeRefOrGetter<string | null | undefined>,
  proxy: MaybeRefOrGetter<string | null | undefined>
) => {
  const client = useClient()

  return useQuery({
    queryKey: ['upgrade-owner', { beacon: toValue(beacon), proxy: toValue(proxy) }],
    queryFn: async (): Promise<Address | null> => {
      if (!client.value) return null

      const beaconAddress = toValue(beacon)
      if (beaconAddress) return await readOwner(client.value, beaconAddress as Address)

      const proxyAddress = toValue(proxy)
      if (!proxyAddress) return null

      // Transparent proxy: admin slot → ProxyAdmin → owner().
      const raw = await getStorageAt(client.value, {
        address: proxyAddress as Address,
        slot: ADMIN_SLOT
      })
      if (!raw) return null
      const admin = getAddress(`0x${raw.slice(-40)}`)
      if (isAddressEqual(admin, zeroAddress)) return null

      return await readOwner(client.value, admin)
    },
    enabled: () => !!(toValue(beacon) || toValue(proxy)),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5
  })
}
