export type TradeStatus = 'open' | 'resolved'
export type FilterType = 'all' | 'open' | 'resolved'

export interface Trade {
  id: string
  market: string
  outcome: string
  type: 'buy' | 'sell'
  shares: number
  entryPrice: number
  currentPrice: number
  status: TradeStatus
  result?: 'won' | 'lost'
  pnl: number
  date: string
  // Metadata for Safe transactions
  conditionId?: string
  outcomeIndex?: number
  redeemable?: boolean
  negativeRisk?: boolean
}

export interface OrderDetails {
  marketUrl: string
  outcome: string
  shares: number
  orderType: 'market' | 'limit'
  total: number
  // Add any other order details you need
}

export type PolymarketPosition = {
  proxyWallet: string
  asset: string
  conditionId: string
  size: number
  avgPrice: number
  initialValue: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  totalBought: number
  realizedPnl: number
  percentRealizedPnl: number
  curPrice: number
  redeemable: boolean
  mergeable: boolean
  title: string
  slug: string
  icon: string
  eventSlug: string
  eventId?: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate: string
  negativeRisk: boolean
}

export type PolynarketClosedPosition = {
  proxyWallet: string
  asset: string
  conditionId: string
  avgPrice: number
  totalBought: number
  realizedPnl: number
  curPrice: number
  timestamp: number
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate: string
}

export interface PolymarketMarket {
  id: string
  question: string
  description?: string
  slug: string
  active: boolean
  closed: boolean
  icon?: string
  image?: string
  volume?: string
  volume24hr?: string | number
  liquidity?: string | number
  spread?: string
  outcomes?: string
  outcomePrices?: string
  clobTokenIds?: string
  conditionId?: string
  endDate?: string
  endDateIso?: string
  gameStartTime?: string
  events?: object[]
  realtimePrices?: Record<
    string,
    {
      bidPrice: number
      askPrice: number
      midPrice: number
      spread: number
    }
  >
  [key: string]: unknown
}
