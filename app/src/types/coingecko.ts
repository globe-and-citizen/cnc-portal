/** Provider response contracts; query caches retain these bodies unchanged. */
export interface TokenPriceResponse {
  market_data: {
    current_price: {
      [currency: string]: number
      usd: number
      cad: number
      eur: number
      idr: number
      inr: number
    }
  }
}

export interface CoinGeckoHistoricalResponse {
  market_data?: { current_price?: { usd?: unknown } }
}

export interface CoinGeckoAssetMarketResponse extends CoinGeckoHistoricalResponse {
  id?: unknown
  platforms?: Record<string, string>
  image?: { small?: unknown; thumb?: unknown; large?: unknown }
}
