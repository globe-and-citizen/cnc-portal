<template>
  <div class="space-y-4">
    <!-- Bottom line -->
    <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
      <p class="text-xs uppercase tracking-wide text-muted">
        Total return (portfolio value − net deposits)
      </p>
      <p class="text-3xl font-bold tabular-nums" :class="signClass(summary.totalReturn)">
        {{ formatSignedUsd(summary.totalReturn) }}
      </p>
    </UPageCard>

    <!-- Balance sheet: net deposits → cash + positions → portfolio value -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <p class="text-xs uppercase tracking-wide text-muted">
          Net deposits
        </p>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.netDeposits) }}
        </p>
        <p class="text-xs text-muted">
          Capital committed
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <p class="text-xs uppercase tracking-wide text-muted">
          Free cash balance
        </p>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.currentCashBalance) }}
        </p>
        <p class="text-xs text-muted">
          On-chain USDC
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <p class="text-xs uppercase tracking-wide text-muted">
          Open positions value
        </p>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.openPositionsValue) }}
        </p>
        <p class="text-xs text-muted">
          Mark-to-market
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <p class="text-xs uppercase tracking-wide text-muted">
          Portfolio value
        </p>
        <p class="text-xl font-semibold tabular-nums">
          {{ formatUsd(summary.totalPortfolioValue) }}
        </p>
        <p class="text-xs text-muted">
          Cash + positions
        </p>
      </UPageCard>
    </div>

    <!-- Reconciliation: the two profit measures should agree -->
    <UAlert
      :color="isReconciled ? 'success' : 'warning'"
      variant="subtle"
      :icon="isReconciled ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
      :title="isReconciled ? 'Books reconciled' : 'Reconciliation gap detected'"
    >
      <template #description>
        <span class="tabular-nums">
          P&L-based return ({{ formatSignedUsd(pnlBasedReturn) }})
          vs cash-based return ({{ formatSignedUsd(summary.totalReturn) }})
          — gap {{ formatSignedUsd(summary.reconciliationGap) }}.
        </span>
        <span v-if="!isReconciled" class="block mt-1">
          A non-zero gap usually means truncated transfer history or a market missing from the positions feed.
        </span>
      </template>
    </UAlert>

    <!-- Detail stats -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <UPageCard
        v-for="stat in stats"
        :key="stat.label"
        variant="subtle"
        :ui="{ container: 'gap-1' }"
      >
        <p class="text-xs uppercase tracking-wide text-muted">
          {{ stat.label }}
        </p>
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

const props = defineProps<{ summary: AccountingSummary }>()

interface Stat {
  label: string
  value: string
  hint?: string
  valueClass?: string
}

const stats = computed<Stat[]>(() => {
  const s = props.summary
  return [
    { label: 'Total deposits', value: formatUsd(s.totalDeposits), valueClass: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total withdrawals', value: formatUsd(s.totalWithdrawals), valueClass: 'text-rose-600 dark:text-rose-400' },
    { label: 'Realized P&L', value: formatSignedUsd(s.realizedPnl), valueClass: signClass(s.realizedPnl), hint: 'Closed exposure' },
    { label: 'Unrealized P&L', value: formatSignedUsd(s.unrealizedPnl), valueClass: signClass(s.unrealizedPnl), hint: 'Open positions' },
    { label: 'Rewards earned', value: formatUsd(s.totalRewards), valueClass: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Trading volume', value: formatUsd(s.tradingVolume), hint: `${s.tradeCount} trades` }
  ]
})

// The two independent profit figures (see AccountingSummary.reconciliationGap).
const pnlBasedReturn = computed(() =>
  props.summary.realizedPnl + props.summary.unrealizedPnl + props.summary.totalRewards
)
/** Books are considered reconciled when the gap is under $1. */
const isReconciled = computed(() => Math.abs(props.summary.reconciliationGap) < 1)
</script>
