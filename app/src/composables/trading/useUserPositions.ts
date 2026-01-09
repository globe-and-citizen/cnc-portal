import { useQuery } from '@tanstack/vue-query'
import axios from 'axios'
import type { PolymarketPosition, PolynarketClosedPosition, Trade } from '@/types/trading'

export function useUserPositions(safeAddress: string | undefined) {
  return useQuery({
    queryKey: ['polymarket-positions', safeAddress],
    queryFn: async (): Promise<Trade[]> => {
      if (!safeAddress) return []
      // Fetch positions using Axios (parallel requests)
      const [openRes, closedRes] = await Promise.all([
        axios.get(`https://data-api.polymarket.com/positions?user=${safeAddress}&limit=50`),
        axios.get(`https://data-api.polymarket.com/closed-positions?user=${safeAddress}&limit=100`)
      ])

      const tradesMap = new Map<string, Trade>()

      // 1. Process Open & Resolved Positions (Current)
      openRes.data.forEach((p: PolymarketPosition) => {
        let status: 'open' | 'resolved' = 'open'
        let result: 'won' | 'lost' | undefined

        // Custom Logic: 1 = Won, 0 = Lost, pending redemption
        if (p.curPrice === 1) {
          status = 'resolved'
          result = 'won'
        } else if (p.curPrice === 0) {
          status = 'resolved'
          result = 'lost'
        } else {
          status = 'open'
        }

        tradesMap.set(p.asset, {
          id: p.asset,
          market: p.title,
          outcome: p.outcome,
          type: 'buy',
          shares: Number(p.size),
          entryPrice: p.avgPrice,
          currentPrice: p.curPrice,
          status,
          result,
          pnl: p.cashPnl,
          date: p.endDate,
          conditionId: p.conditionId,
          outcomeIndex: p.outcomeIndex,
          redeemable: p.redeemable
        })
      })

      // 2. Process Closed Positions (Redeemed)
      closedRes.data.forEach((p: PolynarketClosedPosition) => {
        // Closed positions are already redeemed, marked as 'resolved'
        tradesMap.set(p.asset, {
          id: p.asset,
          market: p.title,
          outcome: p.outcome,
          type: 'buy',
          shares: Number(p.totalBought),
          entryPrice: p.avgPrice,
          currentPrice: p.curPrice,
          status: 'resolved',
          result: p.realizedPnl > 0 ? 'won' : 'lost',
          pnl: p.realizedPnl,
          date: new Date(p.timestamp).toISOString(),
          conditionId: p.conditionId,
          outcomeIndex: p.outcomeIndex,
          redeemable: false
        })
      })

      return Array.from(tradesMap.values())
    },
    enabled: !!safeAddress,
    staleTime: 5000,
    refetchInterval: 10000
  })
}
