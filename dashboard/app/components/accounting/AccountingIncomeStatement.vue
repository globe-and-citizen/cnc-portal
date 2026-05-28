<template>
  <div class="space-y-4">
    <UPageCard variant="subtle">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="font-semibold text-black dark:text-white">
            Income Statement
          </h3>
          <p class="text-sm text-muted mt-0.5">
            {{ accountingPeriod.label }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <USelect
            v-model="periodPreset"
            :items="periodPresetOptions"
            class="w-32"
            size="sm"
          />
          <UInput
            v-if="showAnchorPicker"
            v-model="periodAnchor"
            type="date"
            :max="todayStr"
            class="w-36"
            size="sm"
          />
        </div>
      </div>

      <div v-if="!hasAddress" class="text-muted text-center py-8">
        Enter a wallet address to generate the income statement.
      </div>

      <div v-else class="max-w-xl space-y-1">
        <!-- Trading income -->
        <p class="text-xs uppercase tracking-wide text-muted pt-1">
          Trading income
        </p>
        <div class="flex justify-between py-1.5 pl-3">
          <span>Wins <span class="text-muted text-sm">({{ statement.winCount }})</span></span>
          <span class="tabular-nums text-emerald-600 dark:text-emerald-400">
            {{ formatSignedUsd(statement.wins) }}
          </span>
        </div>
        <div class="flex justify-between py-1.5 pl-3">
          <span>Losses <span class="text-muted text-sm">({{ statement.lossCount }})</span></span>
          <span class="tabular-nums text-rose-600 dark:text-rose-400">
            {{ formatSignedUsd(-statement.losses) }}
          </span>
        </div>
        <div class="flex justify-between py-1.5 pl-3 border-t border-default font-medium">
          <span>Net trading result</span>
          <span class="tabular-nums" :class="signClass(statement.netTradingResult)">
            {{ formatSignedUsd(statement.netTradingResult) }}
          </span>
        </div>

        <!-- Poly rewards -->
        <p class="text-xs uppercase tracking-wide text-muted pt-3">
          Poly rewards
        </p>
        <div class="flex justify-between py-1.5 pl-3">
          <span>Rewards, rebates & referrals</span>
          <span class="tabular-nums text-emerald-600 dark:text-emerald-400">
            {{ formatSignedUsd(statement.polyRewards) }}
          </span>
        </div>

        <!-- Expenses -->
        <p class="text-xs uppercase tracking-wide text-muted pt-3">
          Expenses
        </p>
        <div class="flex justify-between py-1.5 pl-3">
          <span>
            Trading fees
            <span class="text-muted text-sm">(Polymarket charges none)</span>
          </span>
          <span class="tabular-nums">{{ formatUsd(statement.expenses) }}</span>
        </div>

        <!-- Net income (realized only) -->
        <div class="flex justify-between py-2 mt-1 border-t border-default font-semibold">
          <span>Net income <span class="text-muted text-xs">(realized)</span></span>
          <span class="tabular-nums" :class="signClass(statement.netIncome)">
            {{ formatSignedUsd(statement.netIncome) }}
          </span>
        </div>

        <!-- Unrealized P&L on open positions — only meaningful "as of today" -->
        <p class="text-xs uppercase tracking-wide text-muted pt-3">
          Unrealized changes <span v-if="!statement.asOfTodayOnly" class="lowercase">(as-of-today only)</span>
        </p>
        <div class="flex justify-between py-1.5 pl-3">
          <span>Mark-to-market on open positions</span>
          <span v-if="statement.asOfTodayOnly" class="tabular-nums" :class="signClass(statement.unrealizedPnl)">
            {{ formatSignedUsd(statement.unrealizedPnl) }}
          </span>
          <span v-else class="text-muted">—</span>
        </div>
        <div v-if="statement.asOfTodayOnly" class="flex justify-between py-1.5 pl-3">
          <span class="text-muted text-sm">Open positions market value <span class="text-muted">(memo)</span></span>
          <span class="tabular-nums text-muted">{{ formatUsd(statement.openPositionsValue) }}</span>
        </div>

        <!-- Comprehensive net income — bottom line, reconciles to Summary.totalReturn -->
        <div class="flex justify-between py-3 mt-2 border-t-2 border-default text-lg font-bold">
          <span>Comprehensive net income</span>
          <span class="tabular-nums" :class="signClass(statement.comprehensiveNetIncome)">
            {{ formatSignedUsd(statement.comprehensiveNetIncome) }}
          </span>
        </div>

        <p class="text-xs text-muted">
          Net income covers realized results only. Comprehensive net income adds
          unrealized P&L on still-open positions — this is the figure that should
          match Total Return on the Summary tab when the selected period is current.
          Polymarket-reported all-time realized: {{ formatSignedUsd(statement.positionsRealizedPnl) }}<template v-if="!isReconciled">
            ; lot-accounting difference {{ formatSignedUsd(statement.reconciliationGap) }} (markets resolved-worthless without a redeem tx).
          </template>.
        </p>
      </div>
    </UPageCard>

    <UPageCard v-if="hasAddress" variant="subtle">
      <h3 class="font-semibold text-black dark:text-white mb-4">
        Realized trades · {{ totalTrades }}
      </h3>

      <UTable
        :data="pagedTrades"
        :columns="columns"
        :loading="isLoading"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-top',
          separator: 'h-0'
        }"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8 text-muted">
            <UIcon name="i-lucide-trending-up" class="w-12 h-12 mb-3 opacity-60" />
            <p>No realized trades in this period.</p>
          </div>
        </template>

        <template #date-cell="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.original.timestamp) }}</span>
        </template>

        <template #market-cell="{ row }">
          <span class="block max-w-xs truncate">{{ row.original.market }}</span>
        </template>

        <template #outcome-cell="{ row }">
          <span v-if="row.original.outcome" class="font-semibold" :class="outcomeClass(row.original.outcome)">
            {{ row.original.outcome }}
          </span>
          <span v-else class="text-muted">—</span>
        </template>

        <template #kind-cell="{ row }">
          <UBadge :color="KIND_META[row.original.kind].color" variant="subtle">
            {{ KIND_META[row.original.kind].label }}
          </UBadge>
        </template>

        <template #proceeds-cell="{ row }">
          <span class="tabular-nums">{{ formatUsd(row.original.proceeds) }}</span>
        </template>

        <template #costBasis-cell="{ row }">
          <span class="tabular-nums">{{ formatUsd(row.original.costBasis) }}</span>
        </template>

        <template #realizedPnl-cell="{ row }">
          <span class="tabular-nums font-medium" :class="signClass(row.original.realizedPnl)">
            {{ formatSignedUsd(row.original.realizedPnl) }}
          </span>
        </template>
      </UTable>

      <AccountingPagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="totalTrades"
        noun="trades"
      />
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { computed, ref, watch } from 'vue'
import type { PolymarketActivity, PolymarketPosition } from '~/types/polymarket'
import { useAccountingPeriod } from '~/composables/useAccountingPeriod'
import { formatSignedUsd, formatUsd, type LedgerCategoryColor, signClass } from '~/utils/accounting'
import { buildIncomeStatement, type RealizedTradeKind } from '~/utils/incomeStatement'
import AccountingPagination from './AccountingPagination.vue'

const props = defineProps<{
  activities: PolymarketActivity[]
  positions: PolymarketPosition[]
  isLoading: boolean
  hasAddress: boolean
  walletAddress: string
}>()

const pageSize = ref(20)
const currentPage = ref(1)

const {
  todayStr,
  preset: periodPreset,
  anchorDateStr: periodAnchor,
  range: accountingPeriod,
  showAnchorPicker,
  presetOptions: periodPresetOptions
} = useAccountingPeriod()

watch([() => props.walletAddress, accountingPeriod], () => {
  currentPage.value = 1
})

const statement = computed(() =>
  buildIncomeStatement({
    activities: props.activities,
    positions: props.positions,
    periodStart: accountingPeriod.value.start,
    periodEnd: accountingPeriod.value.end
  })
)

/** Reconciled when the lot accounting matches Polymarket's reported figure. */
const isReconciled = computed(() => Math.abs(statement.value.reconciliationGap) < 1)

const totalTrades = computed(() => statement.value.realizedTrades.length)

const pagedTrades = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return statement.value.realizedTrades.slice(start, start + pageSize.value)
})

const columns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'market', header: 'Market' },
  { accessorKey: 'outcome', header: 'Outcome' },
  { accessorKey: 'kind', header: 'Type' },
  { accessorKey: 'proceeds', header: 'Proceeds' },
  { accessorKey: 'costBasis', header: 'Cost basis' },
  { accessorKey: 'realizedPnl', header: 'Realized P&L' }
]

const KIND_META: Record<RealizedTradeKind, { label: string, color: LedgerCategoryColor }> = {
  SELL: { label: 'Sell', color: 'info' },
  REDEEM: { label: 'Redeem', color: 'primary' },
  MERGE: { label: 'Merge', color: 'neutral' },
  RESOLUTION_LOSS: { label: 'Lost at resolution', color: 'error' }
}

function formatDate(ts: number): string {
  return ts ? format(new Date(ts * 1000), 'MMM d, yyyy') : '—'
}

function outcomeClass(outcome: string | undefined): string {
  const normalized = outcome?.trim().toLowerCase()
  if (normalized === 'yes') {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (normalized === 'no') {
    return 'text-rose-600 dark:text-rose-400'
  }
  return 'text-amber-600 dark:text-amber-400'
}
</script>
