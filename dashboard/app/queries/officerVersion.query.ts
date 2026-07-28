import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { readContract } from 'viem/actions'
import { parseAbi, type Address } from 'viem'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

// V2 introduced version(); earlier generations revert on this call.
const VERSION_ABI = parseAbi(['function version() view returns (string)'])

type Client = NonNullable<ReturnType<typeof useClient>['value']>

/**
 * Ask an Officer which generation it is. Returns null for every generation
 * predating V2 — those revert, and a revert here is an expected answer ("I
 * can't tell you"), not a failure, so it must not surface as a query error.
 */
export const fetchOfficerOnchainVersion = async (
  client: Client | undefined,
  address: string | undefined
): Promise<string | null> => {
  if (!client || !address) return null

  try {
    const version = await readContract(client, {
      address: address as Address,
      abi: VERSION_ABI,
      functionName: 'version'
    })
    return version && version.length > 0 ? version : null
  } catch {
    return null
  }
}

export const officerVersionQueryKey = (address: string | undefined) => [
  'officer-onchain-version',
  { address }
]

export const useOfficerOnchainVersionQuery = (address: MaybeRefOrGetter<string | undefined>) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  return useQuery({
    queryKey: officerVersionQueryKey(toValue(address)),
    queryFn: async () => await fetchOfficerOnchainVersion(client.value, toValue(address)),
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    staleTime: Infinity // an Officer proxy never changes generation
  })
}
