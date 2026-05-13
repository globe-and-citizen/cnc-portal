import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { isAddress } from 'viem'
import { fetchPolymarketActivity, type FetchPolymarketActivityParams } from '~/api/polymarket'

export function usePolymarketActivityQuery(
  params: MaybeRefOrGetter<Pick<FetchPolymarketActivityParams, 'user' | 'limit' | 'offset' | 'type' | 'sortBy' | 'sortDirection' | 'side'>>
) {
  return useQuery(
    computed(() => {
      const p = toValue(params)
      const user = p.user?.trim() ?? ''
      return {
        queryKey: ['polymarket', 'activity', { ...p, user }] as const,
        queryFn: async () =>
          await fetchPolymarketActivity({
            user,
            limit: p.limit,
            offset: p.offset,
            type: p.type,
            sortBy: p.sortBy,
            sortDirection: p.sortDirection,
            side: p.side
          }),
        enabled: !!user && isAddress(user as `0x${string}`),
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 2
      }
    })
  )
}
