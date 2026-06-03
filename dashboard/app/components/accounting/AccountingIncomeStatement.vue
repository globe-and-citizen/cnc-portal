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
      <h3 class="font-semibold text-black dark:text-white mb-1">
        Trades by position · {{ totalPositions }} positions
      </h3>
      <p class="text-sm text-muted mb-4">
        Each position groups its buys and sells. <strong>Net = returned − invested</strong> is your
        profit on the position (cash basis — a still-open position doesn't yet credit the unsold shares).
        Click a position to expand its trades.
      </p>

      <UTable
        :data="pagedTrades"
        :columns="columns"
        :grouping="grouping"
        :grouping-options="groupingOptions"
        :meta="tableMeta"
        :loading="isLoading"
        :ui="{
          base: 'table-auto border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-top empty:hidden',
          separator: 'h-0'
        }"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8 text-muted">
            <UIcon name="i-lucide-trending-up" class="w-12 h-12 mb-3 opacity-60" />
            <p>No trades in this period.</p>
          </div>
        </template>

        <!-- First column: position group header (when grouped) or trade date (leaf). -->
        <template #date-cell="{ row }">
          <div v-if="row.getIsGrouped()" class="space-y-0.5">
            <button
              type="button"
              class="flex items-start gap-2 text-left font-medium cursor-pointer"
              @click="row.toggleExpanded()"
            >
              <UIcon
                :name="row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="w-4 h-4 shrink-0 text-muted mt-0.5"
              />
              <span class="wrap-break-word min-w-48">{{ groupLabel(row) }}</span>
              <span class="text-muted text-xs shrink-0">({{ row.getLeafRows().length }})</span>
            </button>
            <p class="pl-6 text-xs text-muted">
              Invested {{ formatUsd(groupInvested(row)) }} · Returned {{ formatUsd(groupReturned(row)) }}
            </p>
          </div>
          <span v-else class="tabular-nums whitespace-nowrap pl-6">
            {{ formatDate(row.original.timestamp) }}
          </span>
        </template>

        <template #action-cell="{ row }">
          <UBadge
            v-if="!row.getIsGrouped()"
            :color="ACTION_META[row.original.action].color"
            variant="subtle"
          >
            {{ ACTION_META[row.original.action].label }}
          </UBadge>
          <span v-else />
        </template>

        <template #outcome-cell="{ row }">
          <span
            v-if="!row.getIsGrouped() && row.original.outcome"
            class="font-semibold"
            :class="outcomeClass(row.original.outcome)"
          >
            {{ row.original.outcome }}
          </span>
          <span v-else-if="!row.getIsGrouped()" class="text-muted">—</span>
          <span v-else />
        </template>

        <!-- Leaf: this trade's shares. Group: bought / sold totals (redeem = sell). -->
        <template #shares-cell="{ row }">
          <span v-if="row.getIsGrouped()" class="tabular-nums">{{ groupSharesLabel(row) }}</span>
          <span v-else class="tabular-nums">{{ formatShares(row.original.shares) }}</span>
        </template>

        <template #cashFlow-cell="{ row }">
          <span
            class="tabular-nums font-medium"
            :class="signClass(row.getIsGrouped() ? groupNet(row) : row.original.cashFlow)"
          >
            {{ formatSignedUsd(row.getIsGrouped() ? groupNet(row) : row.original.cashFlow) }}
          </span>
        </template>
      </UTable>

      <AccountingPagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="totalPositions"
        noun="positions"
      />
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { GroupingOptions, Row } from '@tanstack/vue-table'
import { format } from 'date-fns'
import { computed, ref, watch } from 'vue'
import type { PolymarketActivity, PolymarketPosition } from '~/types/polymarket'
import { useAccountingPeriod } from '~/composables/useAccountingPeriod'
import { formatSignedUsd, formatUsd, type LedgerCategoryColor, signClass } from '~/utils/accounting'
import { buildIncomeStatement } from '~/utils/incomeStatement'
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

type PositionAction = 'BUY' | 'SELL' | 'SPLIT' | 'MERGE' | 'REDEEM'

interface PositionTrade {
  /** Market grouping key — conditionId when present, robust across buys & redeems. */
  marketKey: string
  market: string
  outcome?: string
  timestamp: number
  action: PositionAction
  shares: number
  unitPrice?: number
  /** Gross USDC of the activity. */
  amount: number
  /** Signed cash impact: buys/splits negative, sells/merges/redeems positive. */
  cashFlow: number
  /** Zebra parity of the owning position block on the current page (set at paging). */
  groupEven?: boolean
}

/** True when an activity timestamp falls inside the selected reporting period. */
function inPeriod(ts: number): boolean {
  const { start, end } = accountingPeriod.value
  if (start != null && ts < start) {
    return false
  }
  return ts <= end
}

/** Maps a Polymarket contract activity to a position trade row (null = skip). */
function toPositionTrade(activity: PolymarketActivity): PositionTrade | null {
  const amount = activity.usdcSize ?? 0
  let action: PositionAction
  let cashFlow: number
  if (activity.type === 'TRADE') {
    action = activity.side === 'SELL' ? 'SELL' : 'BUY'
    cashFlow = action === 'SELL' ? amount : -amount
  } else if (activity.type === 'SPLIT') {
    action = 'SPLIT'
    cashFlow = -amount
  } else if (activity.type === 'MERGE') {
    action = 'MERGE'
    cashFlow = amount
  } else if (activity.type === 'REDEEM') {
    action = 'REDEEM'
    cashFlow = amount
  } else {
    return null // rewards / conversions carry no buy/sell on a position
  }
  return {
    marketKey: activity.conditionId ?? activity.asset ?? activity.title ?? 'unknown',
    market: activity.title ?? '—',
    outcome: activity.outcome,
    timestamp: activity.timestamp ?? 0,
    action,
    shares: activity.size ?? 0,
    unitPrice: activity.price,
    amount,
    cashFlow
  }
}

/** Buys + sells grouped per position (market), most recently active first. */
const positionGroups = computed<PositionTrade[][]>(() => {
  const byMarket = new Map<string, PositionTrade[]>()
  for (const activity of props.activities) {
    if (!inPeriod(activity.timestamp ?? 0)) {
      continue
    }
    const trade = toPositionTrade(activity)
    if (!trade) {
      continue
    }
    const list = byMarket.get(trade.marketKey)
    if (list) {
      list.push(trade)
    } else {
      byMarket.set(trade.marketKey, [trade])
    }
  }
  const lastTs = (trades: PositionTrade[]): number => Math.max(...trades.map(t => t.timestamp))
  for (const trades of byMarket.values()) {
    trades.sort((a, b) => b.timestamp - a.timestamp) // most recent first when expanded
  }
  return [...byMarket.values()].sort((a, b) => lastTs(b) - lastTs(a))
})

const totalPositions = computed(() => positionGroups.value.length)

// Paginate by position, then hand the table a flat list of that page's trades —
// UTable regroups them via the `position` grouping column. Each trade carries
// its block's zebra parity so the whole position (header + leaves) shares a shade.
const pagedTrades = computed<PositionTrade[]>(() =>
  positionGroups.value
    .slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
    .flatMap((group, index) => group.map(trade => ({ ...trade, groupEven: index % 2 === 0 })))
)

const columns = [
  // Grouped (and hidden) — the human label is rendered from the leaf rows.
  { id: 'position', header: 'Position', accessorFn: (row: PositionTrade) => row.marketKey },
  { id: 'date', header: 'Position / Date' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'outcome', header: 'Outcome' },
  { accessorKey: 'shares', header: 'Shares' },
  { accessorKey: 'cashFlow', header: 'Amount' }
]

const grouping = ['position']
const groupingOptions = ref<GroupingOptions>({
  groupedColumnMode: 'remove',
  getGroupedRowModel: getGroupedRowModel()
})

// Zebra striping by position block (gray / white), so each market reads as one
// band. Every row keeps its bottom border, which draws the separator line
// between positions and — once expanded — the bar under the group header.
const tableMeta = {
  class: {
    tr: (row: Row<PositionTrade>) => {
      const even = (row.getIsGrouped() ? row.getLeafRows()[0]?.original.groupEven : row.original.groupEven) ?? true
      const zebra = even ? 'bg-default' : 'bg-elevated/60'
      return row.getIsGrouped() ? `${zebra} font-semibold` : zebra
    }
  }
}

const ACTION_META: Record<PositionAction, { label: string, color: LedgerCategoryColor }> = {
  BUY: { label: 'Buy', color: 'info' },
  SELL: { label: 'Sell', color: 'warning' },
  SPLIT: { label: 'Split', color: 'neutral' },
  MERGE: { label: 'Merge', color: 'neutral' },
  REDEEM: { label: 'Redeem', color: 'primary' }
}

/** Market title for a group header row (read off its first child trade). */
function groupLabel(row: Row<PositionTrade>): string {
  return row.getLeafRows()[0]?.original.market ?? '—'
}

/** Σ invested (buy/split cost) under a group header. */
function groupInvested(row: Row<PositionTrade>): number {
  return row.getLeafRows().reduce((sum, leaf) => sum + (leaf.original.cashFlow < 0 ? -leaf.original.cashFlow : 0), 0)
}

/** Σ returned (sell/merge/redeem proceeds) under a group header. */
function groupReturned(row: Row<PositionTrade>): number {
  return row.getLeafRows().reduce((sum, leaf) => sum + (leaf.original.cashFlow > 0 ? leaf.original.cashFlow : 0), 0)
}

/** Net cash result on the position = returned − invested. */
function groupNet(row: Row<PositionTrade>): number {
  return row.getLeafRows().reduce((sum, leaf) => sum + leaf.original.cashFlow, 0)
}

/** Σ shares acquired (BUY + SPLIT) under a group header. */
function groupBoughtShares(row: Row<PositionTrade>): number {
  return row.getLeafRows().reduce(
    (sum, leaf) => sum + (leaf.original.action === 'BUY' || leaf.original.action === 'SPLIT' ? leaf.original.shares : 0),
    0
  )
}

/** Σ shares disposed (SELL + MERGE + REDEEM — a redeem counts as a sell). */
function groupSoldShares(row: Row<PositionTrade>): number {
  return row.getLeafRows().reduce(
    (sum, leaf) => sum + (leaf.original.action === 'SELL' || leaf.original.action === 'MERGE' || leaf.original.action === 'REDEEM' ? leaf.original.shares : 0),
    0
  )
}

function formatDate(ts: number): string {
  return ts ? format(new Date(ts * 1000), 'MMM d, yyyy HH:mm') : '—'
}

function formatShares(value: number | undefined): string {
  return value ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
}

/** Like formatShares but renders 0 as "0" (used for the bought / sold pair). */
function formatShareCount(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/**
 * Group-header shares label: "bought / sold" only when both sides exist;
 * otherwise just the side that's present (no trailing "/0").
 */
function groupSharesLabel(row: Row<PositionTrade>): string {
  const bought = groupBoughtShares(row)
  const sold = groupSoldShares(row)
  if (bought > 0 && sold > 0) {
    return `${formatShareCount(bought)} / ${formatShareCount(sold)}`
  }
  if (bought > 0) {
    return formatShareCount(bought)
  }
  if (sold > 0) {
    return formatShareCount(sold)
  }
  return '—'
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
