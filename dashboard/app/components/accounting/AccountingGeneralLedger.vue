<script setup lang="ts">
import { format } from 'date-fns'
import type { LedgerEntry } from '~/utils/accounting'
import { formatUsd6 } from '~/utils/accounting'
import type { RealizedTrade } from '~/utils/incomeStatement'
import { buildGeneralLedger, generalLedgerToCsv } from '~/utils/generalLedger'

const props = defineProps<{
  ledgerEntries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
  isLoading: boolean
  hasAddress: boolean
  /** Inclusive upper bound (unix seconds). */
  asOf?: number
}>()

const ledger = computed(() =>
  buildGeneralLedger({
    ledgerEntries: props.ledgerEntries,
    realizedTrades: props.realizedTrades,
    asOf: props.asOf
  })
)

const pageSize = 25
const currentPage = ref(1)

watch(() => props.asOf, () => {
  currentPage.value = 1
})

/** One flat row per journal line; date/description show on the first line only. */
interface JournalRow {
  id: string
  isFirst: boolean
  date: string
  description: string
  account: string
  debit: number
  credit: number
  isCredit: boolean
}

const rows = computed<JournalRow[]>(() => {
  const start = (currentPage.value - 1) * pageSize
  const pageEntries = ledger.value.entries.slice(start, start + pageSize)
  const out: JournalRow[] = []
  for (const entry of pageEntries) {
    entry.lines.forEach((line, index) => {
      out.push({
        id: `${entry.id}-${index}`,
        isFirst: index === 0,
        date: index === 0 && entry.timestamp ? format(new Date(entry.timestamp * 1000), 'MMM d, yyyy') : '',
        description: index === 0 ? entry.description : '',
        account: line.account,
        debit: line.debit,
        credit: line.credit,
        isCredit: line.credit > 0
      })
    })
  }
  return out
})

const columns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'account', header: 'Account' },
  { accessorKey: 'debit', header: 'Debit' },
  { accessorKey: 'credit', header: 'Credit' }
]

function onExportClick(): void {
  const csv = generalLedgerToCsv(ledger.value.entries)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'polymarket-general-ledger.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <UPageCard variant="subtle">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 class="font-semibold text-black dark:text-white">
          General Ledger · {{ ledger.entries.length }} entries
        </h3>
        <UButton
          label="Export CSV"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-download"
          :disabled="ledger.entries.length === 0"
          @click="onExportClick"
        />
      </div>

      <UTable
        :data="rows"
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
            <UIcon name="i-lucide-book-open" class="w-12 h-12 mb-3 opacity-60" />
            <p v-if="!hasAddress">
              Enter a wallet address to build the general ledger.
            </p>
            <p v-else>
              No journal entries.
            </p>
          </div>
        </template>

        <template #date-cell="{ row }">
          <span class="tabular-nums whitespace-nowrap" :class="{ 'border-t-2 border-default': row.original.isFirst }">
            {{ row.original.date }}
          </span>
        </template>

        <template #description-cell="{ row }">
          <span class="block max-w-xs truncate" :class="{ 'font-medium': row.original.isFirst }">
            {{ row.original.description }}
          </span>
        </template>

        <template #account-cell="{ row }">
          <span :class="row.original.isCredit ? 'pl-6 text-muted' : ''">
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
        v-if="ledger.entries.length > pageSize"
        class="mt-4 flex justify-end border-t border-default pt-4"
      >
        <UPagination
          v-model:page="currentPage"
          :items-per-page="pageSize"
          :total="ledger.entries.length"
          :sibling-count="1"
          show-edges
          color="neutral"
          variant="outline"
        />
      </div>
    </UPageCard>

    <!-- Trial balance: proves debits = credits -->
    <UPageCard v-if="hasAddress" variant="subtle">
      <h3 class="font-semibold text-black dark:text-white mb-4">
        Trial Balance
      </h3>
      <div class="max-w-2xl">
        <div class="grid grid-cols-4 gap-2 text-xs uppercase tracking-wide text-muted border-b border-default pb-2">
          <span>Account</span>
          <span class="text-right">Debit</span>
          <span class="text-right">Credit</span>
          <span class="text-right">Balance</span>
        </div>
        <div
          v-for="acc in ledger.trialBalance"
          :key="acc.account"
          class="grid grid-cols-4 gap-2 py-1.5 border-b border-default text-sm"
        >
          <span>
            {{ acc.account }}
            <span class="text-muted text-xs">({{ acc.accountClass.toLowerCase() }})</span>
          </span>
          <span class="text-right tabular-nums">{{ acc.totalDebit ? formatUsd6(acc.totalDebit) : '—' }}</span>
          <span class="text-right tabular-nums">{{ acc.totalCredit ? formatUsd6(acc.totalCredit) : '—' }}</span>
          <span class="text-right tabular-nums font-medium">{{ formatUsd6(acc.balance) }}</span>
        </div>
        <div class="grid grid-cols-4 gap-2 py-2 font-semibold border-b-2 border-default">
          <span>Total</span>
          <span class="text-right tabular-nums">{{ formatUsd6(ledger.totalDebit) }}</span>
          <span class="text-right tabular-nums">{{ formatUsd6(ledger.totalCredit) }}</span>
          <span />
        </div>
        <p
          class="mt-3 text-sm flex items-center gap-2"
          :class="ledger.balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
        >
          <UIcon :name="ledger.balanced ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'" class="w-4 h-4" />
          {{ ledger.balanced ? 'Debits equal credits — books balance.' : 'Debits and credits differ — check the data.' }}
        </p>
      </div>
    </UPageCard>
  </div>
</template>
