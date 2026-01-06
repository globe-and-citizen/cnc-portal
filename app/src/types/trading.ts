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
}

export interface OrderDetails {
  marketUrl: string
  outcome: string
  shares: number
  orderType: 'market' | 'limit'
  total: number
  // Add any other order details you need
}
