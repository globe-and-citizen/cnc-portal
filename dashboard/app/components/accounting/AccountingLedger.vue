<template>
  <div class="space-y-4">
    <UPageCard variant="subtle">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="font-semibold text-black dark:text-white">
            General Ledger · {{ totalActivities }} activities · {{ filteredRows.length }} journal lines
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
          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            class="w-44"
            size="sm"
          />
          <AccountingColumnVisibility
            v-model="visibleColumns"
            :items="ALL_COLUMNS"
          />
          <UButton
            label="Export CSV"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-download"
            :disabled="filteredRows.length === 0"
            @click="onExportClick"
          />
        </div>
      </div>

      <UTable
        :data="pagedRows"
        :columns="columns"
        :loading="isLoading"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-top py-1.5',
          separator: 'h-0'
        }"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8 text-muted">
            <UIcon name="i-lucide-receipt-text" class="w-12 h-12 mb-3 opacity-60" />
            <p v-if="!hasAddress">
              Enter a wallet address to build the general ledger.
            </p>
            <p v-else>
              No ledger entries for this filter.
            </p>
          </div>
        </template>

        <template #date-cell="{ row }">
          <span v-if="row.original.isFirst" class="tabular-nums whitespace-nowrap">
            {{ formatDate(row.original.entry.timestamp) }}
          </span>
        </template>

        <template #category-cell="{ row }">
          <UBadge v-if="row.original.isFirst" :color="CATEGORY_META[row.original.entry.category].color" variant="subtle">
            {{ CATEGORY_META[row.original.entry.category].label }}
          </UBadge>
        </template>

        <template #market-cell="{ row }">
          <div v-if="row.original.isFirst" class="flex items-center gap-2 max-w-xs">
            <img
              v-if="row.original.entry.icon"
              :src="row.original.entry.icon"
              :alt="row.original.entry.description"
              class="w-7 h-7 rounded object-cover shrink-0"
            >
            <a
              v-if="marketUrl(row.original.entry)"
              :href="marketUrl(row.original.entry)!"
              target="_blank"
              rel="noopener noreferrer"
              class="truncate hover:underline text-black dark:text-white"
            >
              {{ row.original.entry.description }}
            </a>
            <span v-else class="truncate">{{ row.original.entry.description }}</span>
          </div>
        </template>

        <template #outcome-cell="{ row }">
          <span v-if="row.original.isFirst && row.original.entry.outcome" class="font-semibold" :class="outcomeClass(row.original.entry.outcome)">
            {{ row.original.entry.outcome }}
          </span>
          <span v-else-if="row.original.isFirst" class="text-muted">—</span>
        </template>

        <template #quantity-cell="{ row }">
          <span v-if="row.original.isFirst" class="tabular-nums">{{ formatQty(row.original.entry.quantity) }}</span>
        </template>

        <template #unitPrice-cell="{ row }">
          <span v-if="row.original.isFirst" class="tabular-nums">{{ formatPrice(row.original.entry.unitPrice) }}</span>
        </template>

        <template #amount-cell="{ row }">
          <span v-if="row.original.isFirst" class="tabular-nums">{{ formatUsd2(row.original.entry.amount) }}</span>
        </template>

        <template #cashFlow-cell="{ row }">
          <span v-if="row.original.isFirst" class="tabular-nums font-medium" :class="signClass(row.original.entry.cashFlow)">
            {{ formatSignedUsd(row.original.entry.cashFlow) }}
          </span>
        </template>

        <template #counterparty-cell="{ row }">
          <AccountingCounterparty
            v-if="row.original.isFirst && row.original.entry.counterparty"
            :address="row.original.entry.counterparty"
            :category="row.original.entry.category"
            :wallet-address="walletAddress"
          />
          <span v-else-if="row.original.isFirst" class="text-muted">—</span>
        </template>

        <template #source-cell="{ row }">
          <UBadge
            v-if="row.original.isFirst"
            :color="row.original.entry.source === 'polygonscan' ? 'neutral' : 'primary'"
            variant="subtle"
          >
            {{ row.original.entry.source === 'polygonscan' ? 'On-chain' : 'Polymarket' }}
          </UBadge>
        </template>

        <template #tx-cell="{ row }">
          <a
            v-if="row.original.isFirst && row.original.entry.txHash"
            :href="`https://polygonscan.com/tx/${row.original.entry.txHash}`"
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-xs text-primary hover:underline"
          >
            {{ row.original.entry.txHash.slice(0, 10) }}…
          </a>
          <span v-else-if="row.original.isFirst" class="text-muted">—</span>
        </template>

        <template #account-cell="{ row }">
          <span :class="row.original.credit > 0 ? 'pl-6 text-muted' : ''">
            {{ row.original.account }}
          </span>
        </template>

        <template #debit-cell="{ row }">
          <span class="tabular-nums">{{ row.original.debit ? formatUsd6(row.original.debit) : '' }}</span>
        </template>

        <template #credit-cell="{ row }">
          <span class="tabular-nums">{{ row.original.credit ? formatUsd6(row.original.credit) : '' }}</span>
        </template>
      </UTable>

      <div
        v-if="totalActivities > pageSize"
        class="mt-4 flex justify-end border-t border-default pt-4"
      >
        <UPagination
          v-model:page="currentPage"
          :items-per-page="pageSize"
          :total="totalActivities"
          :sibling-count="1"
          show-edges
          color="neutral"
          variant="outline"
        />
      </div>
    </UPageCard>

    <!-- Trial Balance under the table (no longer behind a separate tab). -->
    <UPageCard v-if="hasAddress" variant="subtle">
      <AccountingTrialBalance :ledger="generalLedger" />
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { computed, ref, watch } from 'vue'
import {
  CATEGORY_META,
  formatSignedUsd,
  formatUsd6,
  type LedgerCategory,
  type LedgerEntry,
  signClass
} from '~/utils/accounting'
import { useAccountingPeriod } from '~/composables/useAccountingPeriod'
import { buildGeneralLedger } from '~/utils/generalLedger'
import type { RealizedTrade } from '~/utils/incomeStatement'
import {
  buildMergedLedger,
  mergedLedgerToCsv,
  type MergedColumnKey,
  type MergedLedgerRow
} from '~/utils/mergedLedger'
import AccountingColumnVisibility, {
  type ColumnOption
} from './AccountingColumnVisibility.vue'
import AccountingTrialBalance from './AccountingTrialBalance.vue'

const props = defineProps<{
  entries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
  isLoading: boolean
  hasAddress: boolean
  walletAddress: string
}>()

const {
  todayStr,
  preset: periodPreset,
  anchorDateStr: periodAnchor,
  range: accountingPeriod,
  showAnchorPicker,
  presetOptions: periodPresetOptions
} = useAccountingPeriod()

const generalLedger = computed(() =>
  buildGeneralLedger({
    ledgerEntries: props.entries,
    realizedTrades: props.realizedTrades,
    periodStart: accountingPeriod.value.start,
    asOf: accountingPeriod.value.end
  })
)

const pageSize = 20
const currentPage = ref(1)
const categoryFilter = ref<'ALL' | LedgerCategory>('ALL')

watch([() => props.walletAddress, categoryFilter, accountingPeriod], () => {
  currentPage.value = 1
})

const categoryOptions = [
  { label: 'All categories', value: 'ALL' as const },
  ...Object.entries(CATEGORY_META).map(([value, meta]) => ({
    label: meta.label,
    value: value as LedgerCategory
  }))
]

// --- Build the merged row list (one row per journal line) ---
const allRows = computed(() =>
  buildMergedLedger({ entries: props.entries, realizedTrades: props.realizedTrades })
)

function inSelectedPeriod(timestamp: number): boolean {
  const { start, end } = accountingPeriod.value
  if (start != null && timestamp < start) {
    return false
  }
  return timestamp <= end
}

const filteredRows = computed(() => {
  const rows = allRows.value.filter(row => inSelectedPeriod(row.entry.timestamp))
  if (categoryFilter.value === 'ALL') {
    return rows
  }
  return rows.filter(row => row.entry.category === categoryFilter.value)
})

// Pagination counts ACTIVITIES (isFirst rows), not journal lines — a page of
// 20 activities can be ~40-60 DOM rows, which still fits the screen.
const activityStarts = computed(() => {
  const starts: number[] = []
  filteredRows.value.forEach((row, idx) => {
    if (row.isFirst) {
      starts.push(idx)
    }
  })
  return starts
})

const totalActivities = computed(() => activityStarts.value.length)

const pagedRows = computed<MergedLedgerRow[]>(() => {
  const startActivityIdx = (currentPage.value - 1) * pageSize
  const endActivityIdx = startActivityIdx + pageSize
  const start = activityStarts.value[startActivityIdx]
  const end = activityStarts.value[endActivityIdx] ?? filteredRows.value.length
  if (start === undefined) {
    return []
  }
  return filteredRows.value.slice(start, end)
})

// --- Column-visibility selector ---
const ALL_COLUMNS: ColumnOption<MergedColumnKey>[] = [
  { label: 'Date', value: 'date' },
  { label: 'Action', value: 'category' },
  { label: 'Market', value: 'market' },
  { label: 'Outcome', value: 'outcome' },
  { label: 'Qty', value: 'quantity' },
  { label: 'Unit price', value: 'unitPrice' },
  { label: 'Amount', value: 'amount' },
  { label: 'Cash flow', value: 'cashFlow' },
  { label: 'Counterparty', value: 'counterparty' },
  { label: 'Account', value: 'account' },
  { label: 'Debit', value: 'debit' },
  { label: 'Credit', value: 'credit' },
  { label: 'Source', value: 'source' },
  { label: 'Tx', value: 'tx' }
]

// Default: everything visible.
const visibleColumns = useLocalStorage<MergedColumnKey[]>(
  'dashboard-accounting-ledger-visible-columns',
  ALL_COLUMNS.map(c => c.value)
)
const isVisible = (key: MergedColumnKey): boolean => visibleColumns.value.includes(key)

const columns = computed(() => {
  const all = [
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'category', header: 'Action' },
    { accessorKey: 'market', header: 'Market' },
    { accessorKey: 'outcome', header: 'Outcome' },
    { accessorKey: 'quantity', header: 'Qty' },
    { accessorKey: 'unitPrice', header: 'Unit price' },
    { accessorKey: 'amount', header: 'Amount' },
    { accessorKey: 'cashFlow', header: 'Cash flow' },
    { accessorKey: 'counterparty', header: 'Counterparty' },
    { accessorKey: 'account', header: 'Account' },
    { accessorKey: 'debit', header: 'Debit' },
    { accessorKey: 'credit', header: 'Credit' },
    { accessorKey: 'source', header: 'Source' },
    { id: 'tx', header: 'Tx' }
  ]
  return all.filter(col => isVisible((col.accessorKey ?? col.id) as MergedColumnKey))
})

function formatDate(ts: number): string {
  return ts ? format(new Date(ts * 1000), 'MMM d, yyyy HH:mm') : '—'
}

function formatQty(qty: number | undefined): string {
  return qty == null ? '—' : qty.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPrice(price: number | undefined): string {
  return price == null ? '—' : `$${price.toFixed(4)}`
}

function formatUsd2(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function marketUrl(entry: LedgerEntry): string | null {
  return entry.marketSlug ? `https://polymarket.com/event/${entry.marketSlug}` : null
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

function onExportClick(): void {
  const csv = mergedLedgerToCsv(filteredRows.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `polymarket-ledger-${props.walletAddress.trim() || 'export'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>
