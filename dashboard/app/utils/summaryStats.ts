import type { AccountingSummary } from '~/utils/accounting'
import { formatSignedUsd, signClass } from '~/utils/accounting'
import { EMPTY_VALUE, formatUsd } from '~/utils/format'

/**
 * Presentation model for the accounting Summary cards — the labels, values and
 * explainer copy `AccountingSummary.vue` renders, kept out of the component so
 * it stays a description of the layout.
 *
 * Every card is derived from a {@link AccountingSummary} snapshot. `isCurrent`
 * says whether that snapshot reaches the present: a past snapshot has no
 * mark-to-market data (see `~/utils/summaryAsOf`), so the live-only cards render
 * a dash and say why instead of showing today's prices under a past date.
 */

export interface SummaryStatExplainer {
  description: string
  formula?: string
  example?: string
}

export interface SummaryStat {
  label: string
  value: string
  hint?: string
  valueClass?: string
  explainer: SummaryStatExplainer
}

const POSITIVE_CLASS = 'text-emerald-600 dark:text-emerald-400'
const NEGATIVE_CLASS = 'text-rose-600 dark:text-rose-400'

/** Hint carried by every card whose source feed only ever describes *now*. */
const LIVE_ONLY_HINT = 'Live figure — today only'

/** Renders a live-only figure, or a dash when the snapshot is dated in the past. */
function live(isCurrent: boolean, value: () => string): string {
  return isCurrent ? value() : EMPTY_VALUE
}

/** The 12 detail cards, laid out as 4 rows of 3 (portfolio → capital → activity). */
export function buildSummaryStats(s: AccountingSummary, isCurrent: boolean): SummaryStat[][] {
  return [
    // Row 1 — portfolio building blocks
    [
      {
        label: 'Net deposits',
        value: formatUsd(s.netDeposits),
        hint: 'Capital committed',
        explainer: {
          description: 'The capital you\'ve actually committed to Polymarket: every USDC you sent to your Polymarket wallet, minus every USDC you withdrew.',
          formula: 'Total deposits − Total withdrawals',
          example: 'Deposit $500, then later withdraw $100, your net deposits are $400.'
        }
      },
      {
        label: 'Free cash balance',
        value: formatUsd(s.currentCashBalance),
        hint: isCurrent ? 'On-chain USDC' : 'On-chain USDC on that date',
        explainer: {
          description: 'USDC sitting idle in your wallet — what you could withdraw or use to place a new bet without selling anything. Read directly from on-chain transfers, so it always matches Polygon.',
          formula: 'Σ USDC received − Σ USDC sent (Etherscan)'
        }
      },
      {
        label: 'Open positions value',
        value: formatUsd(isCurrent ? s.openPositionsValue : s.openContractsAtCost),
        hint: isCurrent ? 'Mark-to-market' : 'At cost — no historical quote',
        explainer: {
          description: 'What your still-open bets would be worth if you sold them right now, at current market prices. A bet on a question that hasn\'t resolved yet is worth somewhere between $0 and $1 per share — this is the live market quote. On a past date there is no quote to read, so the bets held then are carried at what they cost, like the Balance Sheet does.',
          formula: 'Σ (open shares × current price) per market'
        }
      }
    ],
    // Row 2 — portfolio total + realized
    [
      {
        label: 'Open contracts at cost',
        value: formatUsd(s.openContractsAtCost),
        hint: 'Cost basis',
        explainer: {
          description: 'What you originally paid for the bets you still hold — their cost basis, not their current market price. Compare it to \'Open positions value\' to see your paper gain or loss: paying more than they\'re now worth means you\'re sitting on an unrealized loss. This is also the value the balance sheet books open contracts at.',
          formula: 'Σ acquisitions − Σ disposals (cost basis)',
          example: 'You paid $3.86 for bets now quoted at $0.71 → you\'re holding a ~$3.15 unrealized loss.'
        }
      },
      {
        label: 'Portfolio value',
        value: formatUsd(s.totalPortfolioValue),
        hint: 'Cash + positions',
        explainer: {
          description: 'Everything your Polymarket wallet was worth on the reporting date: idle cash plus the value of every open bet — at market price for today, at cost for a past date.',
          formula: 'Free cash balance + Open positions value'
        }
      },
      {
        label: 'Realized P&L',
        value: formatSignedUsd(s.realizedPnl),
        valueClass: signClass(s.realizedPnl),
        hint: 'Lot accounting — same as Income Statement',
        explainer: {
          description: 'Money you actually locked in: when you sold shares, when a market resolved and you redeemed, when you merged shares back to cash, or when a losing bet resolved without redemption. Computed with weighted-average-cost lot accounting on every trade.',
          formula: 'Σ (proceeds − cost basis) per disposed lot',
          example: 'You bought 100 "Yes" shares for $40 ($0.40 each) and sold them later for $60 ($0.60 each). Realized P&L on this trade = +$20.'
        }
      }
    ],
    // Row 3 — capital flow + unrealized
    [
      {
        label: 'Total deposits',
        value: formatUsd(s.totalDeposits),
        valueClass: POSITIVE_CLASS,
        explainer: {
          description: 'Every USDC you ever sent to your Polymarket wallet from an outside address. We get this from Polygon (Etherscan) directly — it never relies on Polymarket reporting.',
          formula: 'Σ incoming USDC transfers (Etherscan)'
        }
      },
      {
        label: 'Total withdrawals',
        value: formatUsd(s.totalWithdrawals),
        valueClass: NEGATIVE_CLASS,
        explainer: {
          description: 'Every USDC you ever sent out of your Polymarket wallet to an outside address.',
          formula: 'Σ outgoing USDC transfers (Etherscan)'
        }
      },
      {
        label: 'Unrealized P&L',
        value: live(isCurrent, () => formatSignedUsd(s.unrealizedPnl)),
        valueClass: isCurrent ? signClass(s.unrealizedPnl) : 'text-muted',
        hint: isCurrent ? 'Open positions' : LIVE_ONLY_HINT,
        explainer: {
          description: 'Paper profit or loss on bets still in play, i.e. how much the current market price differs from what you originally paid. It can swing either way until the market resolves. Only available for today: Polymarket publishes no historical price per market, so a past snapshot carries open bets at cost instead.',
          formula: 'Σ (current value − initial cost) per open position',
          example: 'You paid $0.40 per share for 100 "Yes" shares. The market now trades at $0.55. Unrealized P&L = +$15.'
        }
      }
    ],
    // Row 4 — activity & reconciliation
    [
      {
        label: 'Rewards earned',
        value: formatUsd(s.totalRewards),
        valueClass: POSITIVE_CLASS,
        explainer: {
          description: 'Free USDC Polymarket has paid you: liquidity-provider rewards, maker rebates, and referral payouts. Not the result of any trade — it just lands in your wallet.',
          formula: 'Σ REWARD + MAKER_REBATE + REFERRAL_REWARD activity rows'
        }
      },
      {
        label: 'Trading volume',
        value: formatUsd(s.tradingVolume),
        hint: s.tradeCount === 1 ? '1 trade' : `${s.tradeCount} trades`,
        explainer: {
          description: 'Gross USD value you have traded — buys + sells combined. This is a turnover number, not a profit number: a $1,000 round trip (buy and resell) counts as $2,000 of volume.',
          formula: 'Σ BUY usdcSize + Σ SELL usdcSize'
        }
      },
      {
        label: 'Position basis drift',
        value: live(isCurrent, () => formatSignedUsd(s.positionBasisDrift)),
        valueClass: isCurrent ? signClass(s.positionBasisDrift) : 'text-muted',
        hint: isCurrent ? 'Polymarket basis vs ours' : LIVE_ONLY_HINT,
        explainer: {
          description: 'Reconciliation entry for the gap between Polymarket\'s own reported cost basis on open positions (their cashPnl) and what our weighted-average-cost lot accounting derives from /activity. Without it, the Total return identity would gap by exactly this amount. It only applies to today\'s snapshot — a past one already books open bets at our own cost basis, so there is nothing to reconcile.',
          formula: 'openPositionsValue − openContractsAtCost − unrealizedPnl',
          example: 'Polymarket says you have $100 of open positions with $20 of unrealized profit (basis $80). Our /activity lot accounting computes a basis of $75. Drift = $100 − $75 − $20 = +$5.'
        }
      }
    ]
  ]
}

/** The three headline cards: total return, profile P&L, fees. */
export function buildSummaryHeadline(s: AccountingSummary, isCurrent: boolean) {
  return {
    totalReturn: {
      value: formatSignedUsd(s.totalReturn),
      valueClass: signClass(s.totalReturn),
      hint: isCurrent
        ? 'Portfolio value − net deposits'
        : 'Cash + contracts at cost − net deposits'
    },
    polymarketPnl: {
      value: live(isCurrent, () => formatSignedUsd(s.polymarketPnl)),
      valueClass: isCurrent ? signClass(s.polymarketPnl) : 'text-muted',
      hint: isCurrent ? 'All-time (Polymarket)' : LIVE_ONLY_HINT
    },
    fees: {
      value: formatUsd(s.totalFees),
      hint: s.feeTransactionCount === 1 ? '1 transaction' : `${s.feeTransactionCount} transactions`
    }
  }
}
