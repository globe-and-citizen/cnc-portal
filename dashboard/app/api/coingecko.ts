import { apiClient } from './index'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

/**
 * Token Prices Response from CoinGecko API
 */
export interface TokenPricesResponse {
  'ethereum'?: { usd: number }
  'usd-coin'?: { usd: number }
  'tether'?: { usd: number }
  'polygon-ecosystem-token'?: { usd: number }
}

/**
 * Normalized Token Prices
 */
export interface TokenPrices {
  'ethereum': number
  'usd-coin': number
  'tether': number
  'polygon-ecosystem-token': number
}

/**
 * Fetch token prices from CoinGecko API
 *
 * @param tokenIds - Comma-separated list of CoinGecko token IDs
 * @returns Promise with normalized token prices
 *
 * @example
 * const prices = await fetchTokenPrices('ethereum,usd-coin,tether')
 * console.log(prices.ethereum) // 2500
 */
export const fetchTokenPrices = async (tokenIds: string): Promise<TokenPrices> => {
  const url = `${COINGECKO_API}/simple/price`

  const response = await apiClient.get<TokenPricesResponse>(url, {
    params: {
      ids: tokenIds,
      vs_currencies: 'usd'
    }
  })

  if (!response.data) {
    throw new Error('Failed to fetch token prices')
  }

  // Normalize the response data
  return {
    'ethereum': response.data.ethereum?.usd || 0,
    'usd-coin': response.data['usd-coin']?.usd || 1,
    'tether': response.data.tether?.usd || 1,
    'polygon-ecosystem-token': response.data['polygon-ecosystem-token']?.usd || 0
  }
}
