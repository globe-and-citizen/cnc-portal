import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { PolymarketMarket } from '@/types/'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import axios from 'axios' // Import axios directly, without the apiClient instance
import { SAFE_API_KEY } from '@/constant'

/**
 * Query key factory for polymarket-related queries
 */
export const polymarketKeys = {
  all: ['polymarket'] as const,
  marketData: (url: string | null) => [...polymarketKeys.all, 'marketData', { url }] as const,
  safeBalances: (safeAddress: string | null, chainName: string | null) =>
    [...polymarketKeys.all, 'safeBalances', { safeAddress, chainName }] as const
}

/**
 * Polymarket event containing markets
 */
interface PolymarketEvent {
  markets: PolymarketMarket[]
}

/**
 * Safe balance item
 */
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

/**
 * Response from Safe balances API
 */
export interface SafeBalancesResponse {
  results: SafeBalance[]
}

// ============================================================================
// GET /polymarket/market-data - Fetch market data
// ============================================================================

/**
 * Path parameters for GET /polymarket/market-data (none for this endpoint)
 */
export interface GetMarketDataPathParams {}

/**
 * Query parameters for GET /polymarket/market-data
 */
export interface GetMarketDataQueryParams {
  /** Polymarket event URL */
  url: MaybeRefOrGetter<string | null>
}

/**
 * Combined parameters for useGetMarketDataQuery
 */
export interface GetMarketDataParams {
  pathParams?: GetMarketDataPathParams
  queryParams: GetMarketDataQueryParams
}

/**
 * Fetch market data for polymarket event
 *
 * @endpoint GET /polymarket/market-data
 * @pathParams none
 * @queryParams { url: string }
 * @body none
 */
export const useGetMarketDataQuery = (params: GetMarketDataParams) => {
  const { queryParams } = params

  return useQuery({
    queryKey: polymarketKeys.marketData(toValue(queryParams.url)),
    queryFn: async () => {
      const url = toValue(queryParams.url)

      // Query params: passed as URL query string (?url=xxx)
      const apiQueryParams: { url: string } = { url: url! }

      const { data } = await apiClient.get<PolymarketEvent | PolymarketMarket>(
        '/polymarket/market-data',
        { params: apiQueryParams }
      )
      return data || []
    },
    refetchInterval: 10000,
    enabled: () => !!toValue(queryParams.url)
  })
}

// ============================================================================
// GET Safe balances (external API)
// ============================================================================

/**
 * Path parameters for Safe balances endpoint
 */
export interface GetSafeBalancesPathParams {
  /** Safe address */
  safeAddress: MaybeRefOrGetter<string | null>
  /** Chain name (e.g., 'eth', 'pol') */
  chainName: MaybeRefOrGetter<string | null>
}

/**
 * Query parameters for Safe balances (none for this endpoint)
 */
export interface GetSafeBalancesQueryParams {}

/**
 * Combined parameters for useGetSafeBalancesQuery
 */
export interface GetSafeBalancesParams {
  pathParams: GetSafeBalancesPathParams
  queryParams?: GetSafeBalancesQueryParams
}

/**
 * Fetch Safe Wallet balances (Native and ERC-20)
 * Uses direct axios call to the Safe Transaction Service API
 *
 * @endpoint GET https://api.safe.global/tx-service/{chainName}/api/v2/safes/{safeAddress}/balances/
 * @pathParams { safeAddress: string, chainName: string }
 * @queryParams none
 * @body none
 */
export const useGetSafeBalancesQuery = (params: GetSafeBalancesParams) => {
  const { pathParams } = params

  return useQuery({
    // Add chainName to the queryKey so different networks cache separately
    queryKey: polymarketKeys.safeBalances(toValue(pathParams.safeAddress), toValue(pathParams.chainName)),
    queryFn: async () => {
      const address = toValue(pathParams.safeAddress)
      const chain = toValue(pathParams.chainName)

      if (!address) throw new Error('Safe address is required')
      if (!chain) throw new Error('Chain name is required (e.g., eth, polygon)')

      // Construct the URL using the safe.global public API
      const url = `https://api.safe.global/tx-service/${chain}/api/v2/safes/${address}/balances/`

      // Call axios directly
      const { data } = await axios.get<SafeBalancesResponse>(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer: ${SAFE_API_KEY}`
        }
      })
      return data.results
    },
    // Only enabled if both address and chain are provided
    enabled: () => !!toValue(pathParams.safeAddress) && !!toValue(pathParams.chainName),
    refetchInterval: 30000 // Refresh every 30 seconds
  })
}
