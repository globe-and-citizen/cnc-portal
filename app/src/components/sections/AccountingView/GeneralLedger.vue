<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <AccountingExportBar :context="exportContext" @export="onExport" @print="onPrint" />
    </div>

    <UCard class="w-full">
      <template #header>
        <div class="flex flex-col gap-3">
          <!-- Title -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="bg-muted text-muted flex size-7 items-center justify-center rounded-lg">
                <UIcon name="i-heroicons-book-open" class="size-4.5" />
              </span>
              <span class="text-[15px] font-semibold">General ledger</span>
              <UBadge color="primary" variant="subtle" :label="`${total} entries`" />
            </div>
          </div>

          <!-- Reporting period + account filter + currency filter + show/hide columns -->
          <div class="flex flex-wrap items-center justify-end gap-2.5">
            <DatePicker v-model="period" mode="range" storage-key="cnc-accounting-ledger-period" />
            <AccountFilterSelect
              v-if="showAccountFilter"
              v-model="selectedAccounts"
              :accounts="availableAccountOptions"
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

      <LedgerTable
        :rows="pageRows"
        :total="grandTotal"
        :visible-columns="visibleColumns"
        link-account
        @account-select="openInTrialBalance"
      />

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
import { useRoute, useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import LedgerTable from './LedgerTable.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import DatePicker from '@/components/ui/DatePicker.vue'
import ColumnVisibilitySelect from '@/components/sections/AccountingView/ColumnVisibilitySelect.vue'
import CurrencyFilterSelect from '@/components/sections/AccountingView/CurrencyFilterSelect.vue'
import AccountFilterSelect from '@/components/sections/AccountingView/AccountFilterSelect.vue'
import { usePagination } from '@/composables/usePagination'
import { useFacetFilter } from '@/composables/useFacetFilter'
import { defaultValueForMode, isAllTimeRange, type Range } from '@/utils/dates/picker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useSectionExport } from '@/composables/accounting/useSectionExport'
import { periodLabel } from '@/utils/accounting/presenter'
import {
  filterJournalLedgerByAccount,
  filterJournalLedgerByCurrency,
  filterJournalLedgerEntries,
  journalLedgerAccounts,
  journalLedgerCurrencies,
  journalLedgerRows,
  journalLedgerTotal
} from '@/utils/accounting/journalLedgerPresenter'
import { LEDGER_COLUMNS, type LedgerColumnKey } from '@/utils/accounting/ledgerPresenter'

// Show/hide table columns — persisted across sessions so the choice sticks.
const columnItems = [...LEDGER_COLUMNS]
// Key bumped to -v2 when Currency / Quantity / Rate were added, so a saved
// pre-v2 selection doesn't hide the newly-mandated columns (spec §2).
const visibleColumns = useLocalStorage<LedgerColumnKey[]>(
  'cnc-accounting-ledger-columns-v2',
  columnItems.map((column) => column.value)
)

// Reporting period (range mode) — defaults to "All time" (whole book).
const period = ref<Range>(defaultValueForMode('range') as Range)

const accounting = useAccountingContext()

const route = useRoute()
const router = useRouter()

/**
 * Jump to the Trial Balance for a clicked account — it reads the `account` query
 * param and auto-opens that account's drill-down (its own transactions).
 */
function openInTrialBalance(account: string, instance?: string): void {
  router.push({
    name: 'accounting-trial',
    params: { id: route.params.id },
    // A redeployed pocket carries the contract too, so the jump lands on that
    // deployment's line rather than on the pocket's first one.
    query: { account, ...(instance ? { instance } : {}) }
  })
}

// Filter once, paginate by JournalEntry (which can have any number of lines),
// then flatten the current page for the table. The gross movement total remains
// the total of every selected journal entry, not merely the current page.
const filtered = computed(() =>
  filterJournalLedgerEntries(accounting.journal.value, period.value.start, period.value.end)
)

// Account then currency, each narrowing the feed the next one derives its options
// from ({@link useFacetFilter} owns the "options / selection / narrow" behaviour
// both share). Both filters retain every line belonging to a selected JournalEntry.
const {
  available: availableAccounts,
  show: showAccountFilter,
  selected: selectedAccounts,
  active: activeAccounts,
  result: byAccount
} = useFacetFilter(() => filtered.value, journalLedgerAccountsValues, filterJournalLedgerByAccount)

const {
  available: availableCurrencies,
  show: showCurrencyFilter,
  selected: selectedCurrencies,
  active: activeCurrencies,
  result: filteredByCurrency
} = useFacetFilter(() => byAccount.value, journalLedgerCurrencies, filterJournalLedgerByCurrency)

function journalLedgerAccountsValues(
  entries: Parameters<typeof journalLedgerAccounts>[0]
): string[] {
  return journalLedgerAccounts(entries).map((account) => account.value)
}

const availableAccountOptions = computed(() => {
  const available = new Set(availableAccounts.value)
  return journalLedgerAccounts(filtered.value).filter((account) => available.has(account.value))
})

const total = computed(() => filteredByCurrency.value.length)
const grandTotal = computed(() => journalLedgerTotal(filteredByCurrency.value))

const { page, pageSize, reset } = usePagination(() => total.value, { key: 'ledger' })
watch([period, selectedAccounts, selectedCurrencies], reset, { deep: true })

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const slice = filteredByCurrency.value.slice(start, start + pageSize.value)
  return journalLedgerRows(slice)
})

// A real date window is in play only when the picker isn't on "All time" (whose
// bounds are epoch → today, not a user choice).
const dateSelected = computed(() => !isAllTimeRange(period.value))

// Export the exact selected JournalEntry scope: period, concrete accounts,
// currencies and visible columns. The context line under the buttons mirrors it.
// The period is shown only when a real date range is set — "All time" is noise.
const exportContext = computed(() => {
  const parts = ['Exporting: General Ledger']
  if (dateSelected.value) parts.push(periodLabel(period.value.start, period.value.end))
  parts.push(`${total.value} ${total.value === 1 ? 'entry' : 'entries'}`)
  return parts.join(' · ')
})

// Pass null bounds for "All time" so the export heading omits the date; a real
// window flows through verbatim. Account and currency filters retain whole journal
// entries in PDF and Excel just as they do in the table.
const { onExport, onPrint } = useSectionExport('General ledger', () => ({
  key: 'ledger',
  from: dateSelected.value ? period.value.start : null,
  to: dateSelected.value ? period.value.end : null,
  columns: visibleColumns.value,
  ...(activeAccounts.value ? { journalAccounts: activeAccounts.value } : {}),
  ...(activeCurrencies.value ? { currencies: activeCurrencies.value } : {})
}))
</script>
