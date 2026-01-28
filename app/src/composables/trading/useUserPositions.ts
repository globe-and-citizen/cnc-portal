import { useQuery } from '@tanstack/vue-query'
import axios from 'axios'
import type { PolymarketPosition, PolynarketClosedPosition, Trade } from '@/types/trading'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export interface PnLStats {
  totalPnl: number
  totalPnlPercentage: number
  winningPercentage: number
  totalWon: number
  totalLost: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalInvestment: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
}

export function useUserPositions(safeAddress: MaybeRefOrGetter<string | undefined>) {
  const positionsQuery = useQuery({
    queryKey: ['polymarket-positions', toValue(safeAddress)],
    queryFn: async (): Promise<Trade[]> => {
      if (!toValue(safeAddress)) return []
      // Fetch positions using Axios (parallel requests)
      const [openRes, closedRes] = await Promise.all([
        axios.get(
          `https://data-api.polymarket.com/positions?user=${toValue(safeAddress)}&limit=50`
        ),
        axios.get(
          `https://data-api.polymarket.com/closed-positions?user=${toValue(safeAddress)}&limit=100`
        )
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
          redeemable: p.redeemable,
          negativeRisk: p.negativeRisk ? true : false
        })
      })

      // 2. Process Closed Positions (Redeemed)
      closedRes.data.forEach((p: PolynarketClosedPosition) => {
        // Closed positions are already redeemed, marked as 'resolved'
        if (!tradesMap.get(p.asset)?.redeemable)
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

  // Calculate P&L statistics
  const pnlStats = computed((): PnLStats | null => {
    if (!positionsQuery.data.value || positionsQuery.data.value.length === 0) {
      return null
    }

    const trades = positionsQuery.data.value

    // Filter only resolved trades (both won and lost)
    const resolvedTrades = trades.filter((trade) => trade.status === 'resolved')

    // Filter only trades with defined P&L (should be all resolved trades)
    const tradesWithPnl = resolvedTrades.filter((trade) => trade.pnl !== undefined)

    if (tradesWithPnl.length === 0) {
      return {
        totalPnl: 0,
        totalPnlPercentage: 0,
        winningPercentage: 0,
        totalWon: 0,
        totalLost: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalInvestment: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0
      }
    }

    // Calculate totals
    const totalPnl = tradesWithPnl.reduce((sum, trade) => sum + (trade.pnl || 0), 0)

    // Calculate total investment (cost basis)
    const totalInvestment = tradesWithPnl.reduce((sum, trade) => {
      const cost = (trade.entryPrice || 0) * (trade.shares || 0)
      return sum + cost
    }, 0)

    // Calculate total P&L percentage (relative to investment)
    const totalPnlPercentage = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0

    // Count wins and losses
    const winningTrades = tradesWithPnl.filter((trade) => trade.result === 'won')
    const losingTrades = tradesWithPnl.filter((trade) => trade.result === 'lost')

    // Calculate winning percentage
    const winningPercentage =
      tradesWithPnl.length > 0 ? (winningTrades.length / tradesWithPnl.length) * 100 : 0

    // Calculate total won and lost
    const totalWon = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const totalLost = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0))

    // Calculate averages
    const avgWin = winningTrades.length > 0 ? totalWon / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? totalLost / losingTrades.length : 0

    // Find largest win and loss
    const largestWin =
      winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl || 0)) : 0

    const largestLoss =
      losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl || 0)) : 0

    return {
      totalPnl,
      totalPnlPercentage,
      winningPercentage,
      totalWon,
      totalLost,
      totalTrades: tradesWithPnl.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalInvestment,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss
    }
  })

  return {
    ...positionsQuery,
    pnlStats
  }
}
