import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { PolymarketMarket } from '@/types/'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import axios from 'axios' // Import axios directly, without the apiClient instance
import { SAFE_API_KEY } from '@/constant'

interface PolymarketEvent {
  markets: PolymarketMarket[]
}

interface SafeBalance {
  balance: string
  tokenAddress: string | null
  token: {
    symbol: string
    decimals: number
    tokenAddress: string
    name: string
  } | null
}

export interface SafeBalancesResponse {
  results: SafeBalance[]
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

/**
 * Fetch Safe Wallet balances (Native and ERC-20)
 * Uses direct axios call to the Safe Transaction Service API
 */
export const useSafeBalances = (
  safeAddress: MaybeRefOrGetter<string | null>,
  chainName: MaybeRefOrGetter<string | null> = 'pol'
) => {
  return useQuery({
    // Add chainName to the queryKey so different networks cache separately
    queryKey: ['safeBalances', safeAddress, chainName],
    queryFn: async () => {
      const address = toValue(safeAddress)
      const chain = toValue(chainName)

      if (!address) throw new Error('Safe address is required')
      if (!chain) throw new Error('Chain name is required (e.g., eth, polygon)')

      // Construct the URL using the safe.global public API
      const url = `https://api.safe.global/tx-service/${chain}/api/v2/safes/${address}/balances/`
      //`api.safe.global{chain}/api/v1/safes/${address}/balances/`

      // Call axios directly
      const { data } = await axios.get<SafeBalancesResponse>(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer: ${SAFE_API_KEY}`
          // No Authorization header needed for public V1 API calls
        }
      })
      return data.results
    },
    // Only enabled if both address and chain are provided
    enabled: () => !!toValue(safeAddress) && !!toValue(chainName),
    refetchInterval: 30000 // Refresh every 30 seconds
  })
}
