import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { readMarket, providerInterval, providerQueryPolicy } from '@/lib/providerReads'
import { useUserDataStore } from '@/stores/user'

export type MarketPrices = Record<string, Record<string, number | undefined>>

export function useMarketPricesQuery(
  ids: MaybeRefOrGetter<readonly string[]>,
  currencies: MaybeRefOrGetter<readonly string[]>
) {
  const session = useUserDataStore()
  const targets = computed(() => [...new Set(toValue(ids))].sort())
  const codes = computed(() =>
    [...new Set(toValue(currencies).map((code) => code.toLowerCase()))].sort()
  )
  return useQuery<MarketPrices>({
    queryKey: computed(() => ['market-prices', { ids: targets.value, currencies: codes.value }]),
    enabled: computed(() => session.isAuth && targets.value.length > 0),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        ids: targets.value.join(','),
        vs_currencies: codes.value.join(',')
      })
      const { data } = await readMarket<MarketPrices>(`simple/price?${params}`, signal)
      return data
    },
    staleTime: 60_000,
    gcTime: 600_000,
    refetchInterval: providerInterval('market', 60_000),
    ...providerQueryPolicy
  })
}
