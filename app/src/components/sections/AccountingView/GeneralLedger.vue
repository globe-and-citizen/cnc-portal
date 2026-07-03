<template>
  <UCard class="w-full">
    <template #header>
      <div class="flex flex-col gap-3">
        <!-- Title + category filter -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="bg-muted text-muted flex size-7 items-center justify-center rounded-lg">
              <UIcon name="i-heroicons-book-open" class="size-4.5" />
            </span>
            <span class="text-[15px] font-semibold">General ledger</span>
            <UBadge color="primary" variant="subtle" :label="`${total} entries`" />
          </div>
          <SegmentedPills
            :items="categoryItems"
            :model-value="filter"
            @update:model-value="filter = $event"
          />
        </div>

        <!-- Reporting period + show/hide columns -->
        <div class="flex flex-wrap items-center justify-end gap-2.5">
          <AccountingDatePicker
            v-model="period"
            mode="range"
            storage-key="cnc-accounting-ledger-period"
          />
          <ColumnVisibilitySelect v-model="visibleColumns" :items="columnItems" />
        </div>
      </div>
    </template>

    <LedgerTable :rows="pageRows" :total="grandTotal" :visible-columns="visibleColumns" />

    <template #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        noun="entries"
        data-test-prefix="ledger"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import SegmentedPills, { type PillItem } from './SegmentedPills.vue'
import LedgerTable from './LedgerTable.vue'
import TablePagination from '@/components/TablePagination.vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import ColumnVisibilitySelect from '@/components/ColumnVisibilitySelect.vue'
import { usePagination } from '@/composables/usePagination'
import { defaultValueForMode, type Range } from '@/utils/datePicker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import {
  filterLedgerEntries,
  ledgerRows,
  ledgerTotal,
  ledgerCategories,
  LEDGER_COLUMNS,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerPresenter'

// Show/hide table columns — persisted across sessions so the choice sticks.
const columnItems = [...LEDGER_COLUMNS]
const visibleColumns = useLocalStorage<LedgerColumnKey[]>(
  'cnc-accounting-ledger-columns',
  columnItems.map((c) => c.value)
)

const filter = ref('All')

// Reporting period (range mode) — defaults to "All time" (whole book).
const period = ref<Range>(defaultValueForMode('range') as Range)

const categoryItems: PillItem[] = ledgerCategories.map((c) => ({ value: c, label: c }))

const acc = useAccountingContext()

// Filter once, paginate by entry (a posting spans two rows), then flatten the
// current page into table rows. The "Total movements" figure stays the grand
// total across the whole filtered book, not just the page.
const filtered = computed(() =>
  filterLedgerEntries(acc.entries.value, filter.value, period.value.start, period.value.end)
)
const total = computed(() => filtered.value.length)
const grandTotal = computed(() => ledgerTotal(filtered.value))

const { page, pageSize, reset } = usePagination(() => total.value, { key: 'ledger' })
watch([filter, period], reset, { deep: true })

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return ledgerRows(filtered.value.slice(start, start + pageSize.value))
})
</script>
