import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { PolymarketMarket } from '@/types/'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

interface PolymarketEvent {
  markets: PolymarketMarket[]
}

/**
 * Fetch market data for polymarket event
 */
export const useMarketData = (endpoint: MaybeRefOrGetter<string | null>) => {
  return useQuery({
    queryKey: ['marketData'],
    queryFn: async () => {
      const urlValue = toValue(endpoint)
      if (!urlValue) throw new Error('Endpoint is required')
      const { data } = await apiClient.get<PolymarketEvent | PolymarketMarket>(
        `/polymarket/market-data?url=${encodeURIComponent(urlValue)}`
      )
      return data || []
    },
    refetchInterval: 10000,
    enabled: () => !!toValue(endpoint)
  })
}
