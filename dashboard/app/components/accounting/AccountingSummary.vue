<template>
  <div class="space-y-4">
    <!-- Reporting date — "as of" snapshot, same picker as the Balance Sheet. -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h3 class="font-semibold text-black dark:text-white">
        Summary
      </h3>
      <DatePicker
        v-model="asOf"
        mode="date"
        storage-key="dashboard-accounting-summary-asof"
      />
    </div>

    <p v-if="!snapshot.isCurrent" class="text-xs text-muted">
      Snapshot as of a past date: bets still open then are carried at cost, because Polymarket
      publishes no historical market price. Figures that only exist for today are shown as “—”.
    </p>

    <!-- Headline: Polymarket comparison + our bottom line -->
    <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
      <div class="flex items-center gap-2">
        <p class="text-xs uppercase tracking-wide text-muted">
          Total return
        </p>
        <AccountingMetricExplainer
          title="Total return"
          description="The bottom-line answer to 'did I make or lose money on Polymarket?'. It compares what your wallet was worth on the reporting date to what you originally put in."
          formula="Portfolio value − Net deposits"
          example="If you deposited $1,000 and your wallet (cash + open bets) is now worth $1,150, total return is +$150."
        />
      </div>
      <p class="text-3xl font-bold tabular-nums" :class="headline.totalReturn.valueClass">
        {{ headline.totalReturn.value }}
      </p>
      <p class="text-xs text-muted">
        {{ headline.totalReturn.hint }}
      </p>
    </UPageCard>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Polymarket displayed profit/loss
          </p>
          <AccountingMetricExplainer
            title="Polymarket displayed profit/loss"
            description="All-time profit or loss — the same figure Polymarket shows on your profile page Profit/Loss chart. Pulled from Polymarket's user-pnl API (not reconstructed from /positions), so it stays in sync with polymarket.com/profile even when individual position rows are purged or carry stale per-market P&L. It is an all-time figure only, so a past snapshot leaves it blank."
            formula="Latest point from user-pnl-api.polymarket.com"
          />
        </div>
        <p class="text-3xl font-bold tabular-nums" :class="headline.polymarketPnl.valueClass">
          {{ headline.polymarketPnl.value }}
        </p>
        <p class="text-xs text-muted">
          {{ headline.polymarketPnl.hint }}
        </p>
      </UPageCard>
      <UPageCard variant="subtle" :ui="{ container: 'gap-1' }">
        <div class="flex items-center gap-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Fees
          </p>
          <AccountingMetricExplainer
            title="Fees"
            description="Trading fees and spread you actually paid. Polymarket bakes its fee into the fill price rather than charging it separately — you pay above the quoted price on buys and receive below it on sells — so the fee is the gap between the quoted price and what really moved. The effect peaks near a 50¢ price. Includes market-order slippage as well as the protocol fee."
            formula="Σ |size × price − usdcSize| over all trades"
            example="You buy 100 shares quoted at $0.50 ($50), but $50.88 actually leaves your wallet. Fee = $0.88."
          />
        </div>
        <p class="text-3xl font-bold tabular-nums">
          {{ headline.fees.value }}
        </p>
        <p class="text-xs text-muted">
          {{ headline.fees.hint }}
        </p>
      </UPageCard>
    </div>

    <!-- Detail: 4 rows × 3 columns (portfolio → capital → activity) -->
    <div
      v-for="(row, rowIndex) in detailRows"
      :key="rowIndex"
      class="grid grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <UPageCard
        v-for="stat in row"
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
import type { AccountingSummary, LedgerEntry } from '~/utils/accounting'
import type { RealizedTrade } from '~/utils/incomeStatement'
import { defaultValueForMode, toUnixSeconds } from '~/utils/datePicker'
import { buildSummarySnapshot } from '~/utils/summaryAsOf'
import { buildSummaryHeadline, buildSummaryStats } from '~/utils/summaryStats'
import AccountingMetricExplainer from './AccountingMetricExplainer.vue'

const props = defineProps<{
  /** Live all-time summary — what a "Today" snapshot renders unchanged. */
  summary: AccountingSummary
  ledgerEntries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
}>()

// Point-in-time "as of" date (date mode) — defaults to end of today (current snapshot).
const asOf = ref<Date>(defaultValueForMode('date') as Date)

const snapshot = computed(() => buildSummarySnapshot({
  summary: props.summary,
  ledgerEntries: props.ledgerEntries,
  realizedTrades: props.realizedTrades,
  asOf: toUnixSeconds(asOf.value)
}))

const headline = computed(() => buildSummaryHeadline(snapshot.value.summary, snapshot.value.isCurrent))
const detailRows = computed(() => buildSummaryStats(snapshot.value.summary, snapshot.value.isCurrent))
</script>
