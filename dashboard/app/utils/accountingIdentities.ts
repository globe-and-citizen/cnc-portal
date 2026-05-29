import type { PolygonTokenTransfer } from '~/api/polygonscan'
import type { PolymarketActivity } from '~/types/polymarket'
import type { AccountingSummary } from '~/utils/accounting'
import type { BalanceSheet } from '~/utils/balanceSheet'
import type { GeneralLedger } from '~/utils/generalLedger'
import type { RealizedTrade } from '~/utils/incomeStatement'

/**
 * Eight accounting identities that must hold for the Polymarket books to be
 * considered internally consistent. Each one is computed live from the loaded
 * data and surfaced in `AccountingIdentitiesCard.vue` — a non-zero gap points
 * directly at the failing identity, instead of leaving the user staring at a
 * vague "reconciliation gap" alert.
 */

export type AccountingIdentityId
  = | 'CASH_ONCHAIN'
    | 'NET_DEPOSITS'
    | 'BALANCE_SHEET'
    | 'COST_BASIS'
    | 'PNL_DOUBLE_MEASURE'
    | 'LOT_CAP'
    | 'TRIAL_BALANCE'
    | 'SUMMARY_INCOME'

export interface AccountingIdentity {
  id: AccountingIdentityId
  label: string
  lhsLabel: string
  rhsLabel: string
  lhs: number
  rhs: number
  /** lhs − rhs. */
  gap: number
  /** Tolerance for `holds`. Cost-basis identities are exact (1e-6); the rest tolerate $0.01. */
  tolerance: number
  /** True when |gap| ≤ tolerance. */
  holds: boolean
  /**
   * True when the identity is only meaningful when "as of" = today (e.g. P&L
   * double-measure depends on live `/positions` prices). When false, the card
   * suppresses the row with an explanatory note.
   */
  asOfTodayOnly?: boolean
}

export interface ComputeIdentitiesInput {
  summary: AccountingSummary
  balanceSheet: BalanceSheet
  generalLedger: GeneralLedger
  realizedTrades: RealizedTrade[]
  activities: PolymarketActivity[]
  transfers: PolygonTokenTransfer[]
  /** True when the reporting date is "today" — drives identity #5. */
  isAsOfToday: boolean
}

const CENT = 0.01
const EPSILON = 1e-6

function holds(gap: number, tolerance: number): boolean {
  return Math.abs(gap) <= tolerance
}

/** Per-asset disposed vs acquired share count — minimum headroom across all assets. */
function lotCapHeadroom(activities: PolymarketActivity[]): { lhs: number, rhs: number } {
  const acquired = new Map<string, number>()
  const disposed = new Map<string, number>()
  for (const a of activities) {
    const asset = a.asset
    if (!asset) {
      continue
    }
    const size = a.size ?? 0
    const isBuy = a.type === 'TRADE' && a.side === 'BUY'
    const isSell = a.type === 'TRADE' && a.side === 'SELL'
    if (isBuy || a.type === 'SPLIT') {
      acquired.set(asset, (acquired.get(asset) ?? 0) + size)
    } else if (isSell || a.type === 'REDEEM' || a.type === 'MERGE') {
      disposed.set(asset, (disposed.get(asset) ?? 0) + size)
    }
  }
  // "lhs ≤ rhs" framed as "max disposed minus acquired across all assets ≤ 0".
  let worst = 0
  for (const [asset, disposedShares] of disposed) {
    const overshoot = disposedShares - (acquired.get(asset) ?? 0)
    if (overshoot > worst) {
      worst = overshoot
    }
  }
  // We return the totals as a single check: total disposed (clamped at acquired
  // per asset) vs total disposed (raw); a positive overshoot is the gap.
  return { lhs: worst, rhs: 0 }
}

export function computeAccountingIdentities(input: ComputeIdentitiesInput): AccountingIdentity[] {
  const { summary, balanceSheet: bs, generalLedger: gl, realizedTrades } = input

  const allTimeRealized = realizedTrades.reduce((sum, t) => sum + t.realizedPnl, 0)
  const pnlBasedReturn = summary.realizedPnl + summary.unrealizedPnl + summary.totalRewards

  const out: AccountingIdentity[] = []

  // 1. Cash on-chain identity
  {
    const lhs = summary.currentCashBalance
    const rhs = bs.cash
    out.push({
      id: 'CASH_ONCHAIN',
      label: 'Cash on-chain identity',
      lhsLabel: 'On-chain USDC (in − out)',
      rhsLabel: 'Σ ledger cashFlow',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: CENT,
      holds: holds(lhs - rhs, CENT)
    })
  }

  // 2. Net deposits identity
  {
    const lhs = summary.totalDeposits - summary.totalWithdrawals
    const rhs = bs.ownerCapital
    out.push({
      id: 'NET_DEPOSITS',
      label: 'Net deposits = Owner capital',
      lhsLabel: 'Deposits − Withdrawals',
      rhsLabel: 'Owner capital (balance sheet)',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: CENT,
      holds: holds(lhs - rhs, CENT)
    })
  }

  // 3. Balance sheet identity
  {
    const lhs = bs.totalAssets
    const rhs = bs.totalLiabilities + bs.totalEquity
    out.push({
      id: 'BALANCE_SHEET',
      label: 'Assets = Liabilities + Equity',
      lhsLabel: 'Total assets',
      rhsLabel: 'Liabilities + Equity',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: CENT,
      holds: holds(lhs - rhs, CENT)
    })
  }

  // 4. Cost-basis identity (definitional)
  {
    const lhs = bs.openContractsAtCost
    const rhs = bs.acquisitionCost - bs.disposedCost
    out.push({
      id: 'COST_BASIS',
      label: 'Open contracts = bought − disposed',
      lhsLabel: 'Open contracts at cost',
      rhsLabel: 'Acquired − disposed',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: EPSILON,
      holds: holds(lhs - rhs, EPSILON)
    })
  }

  // 5. P&L double-measure (only meaningful as of today)
  {
    const lhs = summary.totalReturn
    const rhs = pnlBasedReturn
    out.push({
      id: 'PNL_DOUBLE_MEASURE',
      label: 'Total return = Realized + Unrealized + Rewards',
      lhsLabel: 'Cash-based total return',
      rhsLabel: 'P&L-based total return',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: CENT,
      holds: holds(lhs - rhs, CENT),
      asOfTodayOnly: !input.isAsOfToday
    })
  }

  // 6. Lot cap — disposed shares must not exceed acquired shares
  {
    const { lhs, rhs } = lotCapHeadroom(input.activities)
    out.push({
      id: 'LOT_CAP',
      label: 'Lot accounting cap (per asset disposed ≤ acquired)',
      lhsLabel: 'Worst-case overshoot',
      rhsLabel: 'Limit',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: 0,
      holds: holds(lhs - rhs, 0)
    })
  }

  // 7. Trial balance (Σdr = Σcr)
  {
    const lhs = gl.totalDebit
    const rhs = gl.totalCredit
    out.push({
      id: 'TRIAL_BALANCE',
      label: 'Trial balance (Σ debit = Σ credit)',
      lhsLabel: 'Total debits',
      rhsLabel: 'Total credits',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: CENT,
      holds: holds(lhs - rhs, CENT)
    })
  }

  // 8. Summary ↔ Income consistency — exact after Phase 3.
  {
    const lhs = summary.realizedPnl
    const rhs = allTimeRealized
    out.push({
      id: 'SUMMARY_INCOME',
      label: 'Summary realized = Income statement realized',
      lhsLabel: 'Summary.realizedPnl',
      rhsLabel: 'Σ realizedTrades.realizedPnl',
      lhs,
      rhs,
      gap: lhs - rhs,
      tolerance: CENT,
      holds: holds(lhs - rhs, CENT)
    })
  }

  return out
}
