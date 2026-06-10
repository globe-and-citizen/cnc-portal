<template>
  <div class="space-y-4">
    <!-- Polymarket profile comparison -->
    <div class="grid grid-cols-2 gap-4">
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Profit / loss
          </p>
          <AccountingMetricExplainer
            title="Profit / loss"
            description="All-time profit or loss — the same figure Polymarket shows on your profile page Profit/Loss chart. Pulled from Polymarket's user-pnl API (not reconstructed from /positions), so it stays in sync with polymarket.com/profile even when individual position rows are purged or carry stale per-market P&L."
            formula="Latest point from user-pnl-api.polymarket.com"
          />
        </div>
        <p class="text-3xl font-bold tabular-nums" :class="signClass(summary.polymarketPnl)">
          {{ formatSignedUsd(summary.polymarketPnl) }}
        </p>
        <p class="text-xs text-muted">
          All-time (Polymarket)
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Fees
          </p>
          <AccountingMetricExplainer
            title="Fees"
            description="Trading and settlement costs detected when on-chain USDC moved less than Polymarket's activity feed reported for the same transaction — almost always a fee or slippage."
            formula="Σ |cashFlow| over SETTLEMENT_ADJUSTMENT where cashFlow < 0"
            example="A trade is reported as $50 in the activity feed, but $49.97 actually moved on-chain. Fee = $0.03."
          />
        </div>
        <p class="text-3xl font-bold tabular-nums">
          {{ formatUsd(summary.totalFees) }}
        </p>
        <p class="text-xs text-muted">
          {{ summary.feeTransactionCount === 1 ? '1 transaction' : `${summary.feeTransactionCount} transactions` }}
        </p>
      </UPageCard>
    </div>

    <!-- Bottom line -->
    <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
      <div class="flex items-center gap-2">
        <p class="text-xs uppercase tracking-wide text-muted">
          Total return (portfolio value − net deposits)
        </p>
        <AccountingMetricExplainer
          title="Total return"
          description="The bottom-line answer to 'did I make or lose money on Polymarket?'. It compares what your wallet is worth right now to what you originally put in."
          formula="Portfolio value − Net deposits"
          example="If you deposited $1,000 and your wallet (cash + open bets) is now worth $1,150, total return is +$150."
        />
      </div>
      <p class="text-3xl font-bold tabular-nums" :class="signClass(summary.totalReturn)">
        {{ formatSignedUsd(summary.totalReturn) }}
      </p>
    </UPageCard>

    <!-- Balance sheet: net deposits → cash + positions → portfolio value -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Net deposits
          </p>
          <AccountingMetricExplainer
            title="Net deposits"
            description="The capital you've actually committed to Polymarket: every USDC you sent to your Polymarket wallet, minus every USDC you withdrew."
            formula="Total deposits − Total withdrawals"
            example="Deposit $500, then later withdraw $100, your net deposits are $400."
          />
        </div>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.netDeposits) }}
        </p>
        <p class="text-xs text-muted">
          Capital committed
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Free cash balance
          </p>
          <AccountingMetricExplainer
            title="Free cash balance"
            description="USDC currently sitting idle in your wallet — what you could withdraw or use to place a new bet without selling anything. Read directly from on-chain transfers, so it always matches Polygon."
            formula="Σ USDC received − Σ USDC sent (Etherscan)"
          />
        </div>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.currentCashBalance) }}
        </p>
        <p class="text-xs text-muted">
          On-chain USDC
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Open positions value
          </p>
          <AccountingMetricExplainer
            title="Open positions value"
            description="What your still-open bets would be worth if you sold them right now, at current market prices. A bet on a question that hasn't resolved yet is worth somewhere between $0 and $1 per share — this is the live market quote."
            formula="Σ (open shares × current price) per market"
          />
        </div>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.openPositionsValue) }}
        </p>
        <p class="text-xs text-muted">
          Mark-to-market
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Open contracts at cost
          </p>
          <AccountingMetricExplainer
            title="Open contracts at cost"
            description="What you originally paid for the bets you still hold — their cost basis, not their current market price. Compare it to 'Open positions value' to see your paper gain or loss: paying more than they're now worth means you're sitting on an unrealized loss. This is also the value the balance sheet books open contracts at."
            formula="Σ acquisitions − Σ disposals (cost basis)"
            example="You paid $3.86 for bets now quoted at $0.71 → you're holding a ~$3.15 unrealized loss."
          />
        </div>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.openContractsAtCost) }}
        </p>
        <p class="text-xs text-muted">
          Cost basis
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Portfolio value
          </p>
          <AccountingMetricExplainer
            title="Portfolio value"
            description="Everything your Polymarket wallet is worth right now: idle cash plus the current market value of every open bet."
            formula="Free cash balance + Open positions value"
          />
        </div>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.totalPortfolioValue) }}
        </p>
        <p class="text-xs text-muted">
          Cash + positions
        </p>
      </UPageCard>
    </div>

    <!-- Detail stats -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <UPageCard
        v-for="stat in stats"
        :key="stat.label"
        variant="subtle"
        :ui="{ container: 'gap-1' }"
      >
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            {{ stat.label }}
          </p>
          <AccountingMetricExplainer
            :title="stat.label"
            :description="stat.explainer.description"
            :formula="stat.explainer.formula"
            :example="stat.explainer.example"
          />
        </div>
        <p class="text-xl font-semibold tabular-nums" :class="stat.valueClass">
          {{ stat.value }}
        </p>
        <p v-if="stat.hint" class="text-xs text-muted">
          {{ stat.hint }}
        </p>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type AccountingSummary, formatSignedUsd, formatUsd, signClass } from '~/utils/accounting'
import AccountingMetricExplainer from './AccountingMetricExplainer.vue'

const props = defineProps<{ summary: AccountingSummary }>()

interface Explainer {
  description: string
  formula?: string
  example?: string
}

interface Stat {
  label: string
  value: string
  hint?: string
  valueClass?: string
  explainer: Explainer
}

const stats = computed<Stat[]>(() => {
  const s = props.summary
  return [
    {
      label: 'Total deposits',
      value: formatUsd(s.totalDeposits),
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      explainer: {
        description: 'Every USDC you ever sent to your Polymarket wallet from an outside address. We get this from Polygon (Etherscan) directly — it never relies on Polymarket reporting.',
        formula: 'Σ incoming USDC transfers (Etherscan)'
      }
    },
    {
      label: 'Total withdrawals',
      value: formatUsd(s.totalWithdrawals),
      valueClass: 'text-rose-600 dark:text-rose-400',
      explainer: {
        description: 'Every USDC you ever sent out of your Polymarket wallet to an outside address.',
        formula: 'Σ outgoing USDC transfers (Etherscan)'
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
    },
    {
      label: 'Unrealized P&L',
      value: formatSignedUsd(s.unrealizedPnl),
      valueClass: signClass(s.unrealizedPnl),
      hint: 'Open positions',
      explainer: {
        description: 'Paper profit or loss on bets still in play, i.e. how much the current market price differs from what you originally paid. It can swing either way until the market resolves.',
        formula: 'Σ (current value − initial cost) per open position',
        example: 'You paid $0.40 per share for 100 "Yes" shares. The market now trades at $0.55. Unrealized P&L = +$15.'
      }
    },
    {
      label: 'Rewards earned',
      value: formatUsd(s.totalRewards),
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      explainer: {
        description: 'Free USDC Polymarket has paid you: liquidity-provider rewards, maker rebates, and referral payouts. Not the result of any trade — it just lands in your wallet.',
        formula: 'Σ REWARD + MAKER_REBATE + REFERRAL_REWARD activity rows'
      }
    },
    {
      label: 'Trading volume',
      value: formatUsd(s.tradingVolume),
      hint: `${s.tradeCount} trades`,
      explainer: {
        description: 'Gross USD value you have traded — buys + sells combined. This is a turnover number, not a profit number: a $1,000 round trip (buy and resell) counts as $2,000 of volume.',
        formula: 'Σ BUY usdcSize + Σ SELL usdcSize'
      }
    },
    {
      label: 'Position basis drift',
      value: formatSignedUsd(s.positionBasisDrift),
      valueClass: signClass(s.positionBasisDrift),
      hint: 'Polymarket basis vs ours',
      explainer: {
        description: 'Reconciliation entry for the gap between Polymarket\'s own reported cost basis on open positions (their cashPnl) and what our weighted-average-cost lot accounting derives from /activity. Without it, the Total return identity would gap by exactly this amount.',
        formula: 'openPositionsValue − openContractsAtCost − unrealizedPnl',
        example: 'Polymarket says you have $100 of open positions with $20 of unrealized profit (basis $80). Our /activity lot accounting computes a basis of $75. Drift = $100 − $75 − $20 = +$5.'
      }
    }
  ]
})
</script>
