import { useInfiniteQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { getBlockNumber, getLogs } from 'viem/actions'
import { isAddress, type Address } from 'viem'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { fetchContractLogPage, initialLogCursor, type LogCursor } from '~/utils/contractLogPages'

export const useContractLogsQuery = (
  address: MaybeRefOrGetter<string | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true
) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  return useInfiniteQuery({
    queryKey: computed(() => ['contract-logs', { address: toValue(address), chainId }] as const),
    initialPageParam: null as LogCursor | null,
    queryFn: async ({ pageParam, queryKey }) => {
      const target = queryKey[1].address
      if (!client.value || !target || !isAddress(target)) throw new Error('Contract log source is unavailable')
      const source = client.value
      const cursor = pageParam ?? initialLogCursor(await getBlockNumber(source))
      return fetchContractLogPage(target as Address, cursor, range => getLogs(source, range))
    },
    getNextPageParam: page => page.next ?? undefined,
    enabled: () => !!toValue(address) && !!toValue(enabled),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60
  })
}
