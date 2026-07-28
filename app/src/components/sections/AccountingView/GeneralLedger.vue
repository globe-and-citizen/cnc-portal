<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <AccountingExportBar :context="exportContext" @export="onExport" @print="onPrint" />
    </div>

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

          <!-- Reporting period + currency filter + show/hide columns -->
          <div class="flex flex-wrap items-center justify-end gap-2.5">
            <AccountingDatePicker
              v-model="period"
              mode="range"
              storage-key="cnc-accounting-ledger-period"
            />
            <CurrencyFilterSelect
              v-if="showCurrencyFilter"
              v-model="selectedCurrencies"
              :currencies="availableCurrencies"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import SegmentedPills, { type PillItem } from './SegmentedPills.vue'
import LedgerTable from './LedgerTable.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import TablePagination from '@/components/TablePagination.vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import ColumnVisibilitySelect from '@/components/ColumnVisibilitySelect.vue'
import CurrencyFilterSelect from '@/components/CurrencyFilterSelect.vue'
import { usePagination } from '@/composables/usePagination'
import { defaultValueForMode, isAllTimeRange, type Range } from '@/utils/datePicker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { periodLabel } from '@/utils/accounting/presenter'
import { exportFilename } from '@/utils/accounting/exportNaming'
import type { SectionSpec } from '@/utils/accounting/exportSpec'
import {
  filterLedgerEntries,
  filterLedgerByCurrency,
  ledgerCurrencies,
  ledgerRows,
  ledgerTotal,
  ledgerCategories,
  ledgerFeeRows,
  ledgerFeeTotal,
  FEE_FILTER,
  LEDGER_COLUMNS,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerPresenter'

// Show/hide table columns — persisted across sessions so the choice sticks.
const columnItems = [...LEDGER_COLUMNS]
// Key bumped to -v2 when Currency / Quantity / Rate were added, so a saved
// pre-v2 selection doesn't hide the newly-mandated columns (spec §2).
const visibleColumns = useLocalStorage<LedgerColumnKey[]>(
  'cnc-accounting-ledger-columns-v2',
  columnItems.map((c) => c.value)
)

// Active category filter — persisted so a reload keeps the user's chosen tab
// rather than snapping back to "All". `Fee` is a pseudo-category pill that
// isolates the Transaction Fee Expense legs (see filterLedgerEntries).
const filter = useLocalStorage('ledger_active_category_filter', 'All')

// Reporting period (range mode) — defaults to "All time" (whole book).
const period = ref<Range>(defaultValueForMode('range') as Range)

const categoryItems: PillItem[] = ledgerCategories.map((c) => ({ value: c, label: c }))

const acc = useAccountingContext()

// Filter once, paginate by entry (a posting spans two rows), then flatten the
// current page into table rows. The "Total movements" figure stays the grand
// total across the whole filtered book, not just the page.
const isFeeFilter = computed(() => filter.value === FEE_FILTER)

// After category + date + fee, before currency — so the currency options reflect
// the data in view and recompute when those upstream filters change (spec §4).
const filtered = computed(() =>
  filterLedgerEntries(acc.entries.value, filter.value, period.value.start, period.value.end)
)

// The distinct currencies currently in view. The selector is shown only when at
// least two are present (a single-currency ledger needs no filter).
const availableCurrencies = computed(() => ledgerCurrencies(filtered.value, isFeeFilter.value))
const showCurrencyFilter = computed(() => availableCurrencies.value.length >= 2)

// Selected currencies (defaults to all). Reconciled whenever the available set
// changes: keep what's still present, falling back to "all" when nothing valid
// remains — so switching another filter never leaves a stale, empty selection.
// When the whole set was selected (the default), stay "all" as new currencies
// appear — the ledger loads incrementally, so SHER can show up after POL and
// must not be left unselected.
const selectedCurrencies = ref<string[]>([])
watch(
  availableCurrencies,
  (avail, prev) => {
    const wasAll = !prev || selectedCurrencies.value.length >= prev.length
    if (wasAll) {
      selectedCurrencies.value = [...avail]
      return
    }
    const kept = selectedCurrencies.value.filter((c) => avail.includes(c))
    selectedCurrencies.value = kept.length ? kept : [...avail]
  },
  { immediate: true }
)

// The currencies to actually filter by, or null when there's nothing to narrow
// (selector hidden, or every currency selected). Shared by the view and export.
const activeCurrencies = computed<string[] | null>(() => {
  if (!showCurrencyFilter.value) return null
  if (selectedCurrencies.value.length >= availableCurrencies.value.length) return null
  return selectedCurrencies.value
})

const filteredByCurrency = computed(() =>
  activeCurrencies.value === null
    ? filtered.value
    : filterLedgerByCurrency(filtered.value, activeCurrencies.value, isFeeFilter.value)
)

const total = computed(() => filteredByCurrency.value.length)
const grandTotal = computed(() =>
  isFeeFilter.value
    ? ledgerFeeTotal(filteredByCurrency.value)
    : ledgerTotal(filteredByCurrency.value)
)

const { page, pageSize, reset } = usePagination(() => total.value, { key: 'ledger' })
watch([filter, period, selectedCurrencies], reset, { deep: true })

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const slice = filteredByCurrency.value.slice(start, start + pageSize.value)
  return isFeeFilter.value ? ledgerFeeRows(slice) : ledgerRows(slice)
})

// A real date window is in play only when the picker isn't on "All time" (whose
// bounds are epoch → today, not a user choice).
const dateSelected = computed(() => !isAllTimeRange(period.value))

// Export the exact rows currently visible: active category, period and columns.
// The context line under the buttons mirrors that so the scope is unambiguous.
// The period is shown only when a real date range is set — "All time" is noise.
const exportContext = computed(() => {
  const parts = [`Exporting: ${filter.value}`]
  if (dateSelected.value) parts.push(periodLabel(period.value.start, period.value.end))
  parts.push(`${total.value} ${total.value === 1 ? 'entry' : 'entries'}`)
  return parts.join(' · ')
})

const { exportPdf, exportExcel } = useAccountingExport()
// Pass null bounds for "All time" so the export heading omits the date; a real
// window flows through verbatim.
const spec = (): SectionSpec => ({
  key: 'ledger',
  filter: filter.value,
  from: dateSelected.value ? period.value.start : null,
  to: dateSelected.value ? period.value.end : null,
  columns: visibleColumns.value,
  ...(activeCurrencies.value ? { currencies: activeCurrencies.value } : {})
})
// The filename mirrors the export scope: the active category, plus the period
// when a real range is set (all-time needs no date suffix).
const onExport = () => {
  const s = spec()
  exportExcel([s], exportFilename(s, 'xlsx'), 'General ledger exported to Excel')
}
const onPrint = () => {
  const s = spec()
  exportPdf([s], { filename: exportFilename(s, 'pdf') }, 'General ledger exported to PDF')
}
</script>
