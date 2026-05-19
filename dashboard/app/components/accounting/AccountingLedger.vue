<template>
  <UPageCard variant="subtle">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <h3 class="font-semibold text-black dark:text-white">
        Ledger · {{ filteredEntries.length }} entries
      </h3>
      <div class="flex items-center gap-2">
        <USelect
          v-model="categoryFilter"
          :items="categoryOptions"
          class="w-44"
          size="sm"
        />
        <UButton
          label="Export CSV"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-download"
          :disabled="entries.length === 0"
          @click="onExportClick"
        />
      </div>
    </div>

    <UTable
      :data="pagedEntries"
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
          <UIcon name="i-lucide-calculator" class="w-12 h-12 mb-3 opacity-60" />
          <p v-if="!hasAddress">
            Enter a wallet address to build the accounting ledger.
          </p>
          <p v-else>
            No ledger entries for this filter.
          </p>
        </div>
      </template>

      <template #date-cell="{ row }">
        <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.original.timestamp) }}</span>
      </template>

      <template #category-cell="{ row }">
        <UBadge :color="CATEGORY_META[row.original.category].color" variant="subtle">
          {{ CATEGORY_META[row.original.category].label }}
        </UBadge>
      </template>

      <template #market-cell="{ row }">
        <div class="flex items-center gap-2 max-w-xs">
          <img
            v-if="row.original.icon"
            :src="row.original.icon"
            :alt="row.original.description"
            class="w-7 h-7 rounded object-cover shrink-0"
          >
          <a
            v-if="marketUrl(row.original)"
            :href="marketUrl(row.original)!"
            target="_blank"
            rel="noopener noreferrer"
            class="truncate hover:underline text-black dark:text-white"
          >
            {{ row.original.description }}
          </a>
          <span v-else class="truncate">{{ row.original.description }}</span>
        </div>
      </template>

      <template #outcome-cell="{ row }">
        <span
          v-if="row.original.outcome"
          class="font-semibold"
          :class="outcomeClass(row.original.outcome)"
        >
          {{ row.original.outcome }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>

      <template #quantity-cell="{ row }">
        <span class="tabular-nums">{{ formatQty(row.original.quantity) }}</span>
      </template>

      <template #unitPrice-cell="{ row }">
        <span class="tabular-nums">{{ formatPrice(row.original.unitPrice) }}</span>
      </template>

      <template #amount-cell="{ row }">
        <span class="tabular-nums">{{ formatUsd(row.original.amount) }}</span>
      </template>

      <template #cashFlow-cell="{ row }">
        <span class="tabular-nums font-medium" :class="signClass(row.original.cashFlow)">
          {{ formatSignedUsd(row.original.cashFlow) }}
        </span>
      </template>

      <template #tx-cell="{ row }">
        <a
          v-if="row.original.txHash"
          :href="`https://polygonscan.com/tx/${row.original.txHash}`"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-xs text-primary hover:underline"
        >
          {{ row.original.txHash.slice(0, 10) }}…
        </a>
        <span v-else class="text-muted">—</span>
      </template>
    </UTable>

    <div
      v-if="filteredEntries.length > pageSize"
      class="mt-4 flex justify-end border-t border-default pt-4"
    >
      <UPagination
        v-model:page="currentPage"
        :items-per-page="pageSize"
        :total="filteredEntries.length"
        :sibling-count="1"
        show-edges
        color="neutral"
        variant="outline"
      />
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import {
  CATEGORY_META,
  formatSignedUsd,
  formatUsd,
  ledgerToCsv,
  type LedgerCategory,
  type LedgerEntry,
  signClass
} from '~/utils/accounting'

const props = defineProps<{
  entries: LedgerEntry[]
  isLoading: boolean
  hasAddress: boolean
  walletAddress: string
}>()

const pageSize = 20
const currentPage = ref(1)
const categoryFilter = ref<'ALL' | LedgerCategory>('ALL')

watch([() => props.walletAddress, categoryFilter], () => {
  currentPage.value = 1
})

const categoryOptions = [
  { label: 'All categories', value: 'ALL' as const },
  ...Object.entries(CATEGORY_META).map(([value, meta]) => ({
    label: meta.label,
    value: value as LedgerCategory
  }))
]

const filteredEntries = computed(() =>
  categoryFilter.value === 'ALL'
    ? props.entries
    : props.entries.filter(entry => entry.category === categoryFilter.value)
)

const pagedEntries = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredEntries.value.slice(start, start + pageSize)
})

const columns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'category', header: 'Action' },
  { accessorKey: 'market', header: 'Market' },
  { accessorKey: 'outcome', header: 'Outcome' },
  { accessorKey: 'quantity', header: 'Qty' },
  { accessorKey: 'unitPrice', header: 'Unit price' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'cashFlow', header: 'Cash flow' },
  { id: 'tx', header: 'Tx' }
]

function formatDate(ts: number): string {
  return ts ? format(new Date(ts * 1000), 'MMM d, yyyy HH:mm') : '—'
}

function formatQty(qty: number | undefined): string {
  return qty == null ? '—' : qty.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPrice(price: number | undefined): string {
  return price == null ? '—' : `$${price.toFixed(4)}`
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
  const csv = ledgerToCsv(props.entries)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `polymarket-ledger-${props.walletAddress.trim() || 'export'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>
