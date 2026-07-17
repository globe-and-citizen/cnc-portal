import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { getBalance } from 'viem/actions'
import type { Address } from 'viem'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Read a contract's native (POL) balance on-chain. Returns the raw wei value;
 * format at the call site with viem's formatEther.
 */
export const useContractBalanceQuery = (address: MaybeRefOrGetter<string | null | undefined>) => {
  const client = useClient()

  return useQuery({
    queryKey: ['contract-balance', { address: toValue(address) }],
    queryFn: async (): Promise<bigint | null> => {
      const target = toValue(address)
      if (!target || !client.value) return null
      return await getBalance(client.value, { address: target as Address })
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30
  })
}
