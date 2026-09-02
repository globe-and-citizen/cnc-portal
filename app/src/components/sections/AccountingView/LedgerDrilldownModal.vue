<template>
  <UModal
    v-model:open="open"
    :title="account"
    :description="`General ledger entries composing this line — balance ${total}`"
    :ui="{ content: 'rounded-2xl sm:max-w-6xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UBadge
              color="primary"
              variant="subtle"
              :label="`${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`"
            />
            <span class="text-muted text-sm">
              net to <span class="text-highlighted font-semibold tabular-nums">{{ total }}</span>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <ColumnVisibilitySelect v-model="visibleColumns" :items="columnItems" />
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-arrow-down-tray"
              label="Excel"
              data-test="drilldown-export-excel"
              @click="exportDrilldown('excel')"
            />
            <UButton
              color="neutral"
              size="sm"
              icon="i-heroicons-printer"
              label="PDF"
              data-test="drilldown-export-pdf"
              @click="exportDrilldown('pdf')"
            />
          </div>
        </div>

        <LedgerTable
          :rows="pageRows"
          :total="total"
          :visible-columns="visibleColumns"
          :show-balance="!!balance?.account"
          :closing-balance="balance?.closing"
        />

        <TablePagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="entryCount"
          noun="entries"
          data-test-prefix="drilldown"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import LedgerTable from './LedgerTable.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ColumnVisibilitySelect from '@/components/sections/AccountingView/ColumnVisibilitySelect.vue'
import {
  ledgerRows,
  LEDGER_COLUMNS,
  NO_POCKET_INSTANCES,
  type LedgerColumnKey,
  type PocketInstanceIndex
} from '@/utils/accounting/ledgerPresenter'
import {
  scopedNet,
  openingRow,
  withRunningBalance,
  NO_OPENING
} from '@/utils/accounting/accountLedger'
import type { DrilldownBalance } from '@/composables/accounting/useLedgerDrilldown'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const props = defineProps<{
  account: string
  total: string
  entries: LedgerEntry[]
  /** The running "Balance" column: the one account being drilled, what it carries
   *  into the window (the ledger's "Opening balance" line) and where it closes.
   *  Absent for an aggregate line, whose accounts share no single natural side. */
  balance?: DrilldownBalance
  /** Storage key for this statement's persisted column preference. */
  columnsStorageKey: string
  /** Deployment numbering for the whole book, so a redeployed pocket's postings
   *  read under the same numbered name here as in the trial balance. */
  instances?: PocketInstanceIndex
}>()

const open = defineModel<boolean>('open', { required: true })
// The column preference belongs to this modal. It is persisted per statement and
// emitted with each export so the file matches what the user sees.
const visibleColumns = useLocalStorage<LedgerColumnKey[]>(
  props.columnsStorageKey,
  LEDGER_COLUMNS.map((column) => column.value)
)
const emit = defineEmits<{ export: [format: 'pdf' | 'excel', columns: LedgerColumnKey[]] }>()

const columnItems = [...LEDGER_COLUMNS]

const entryCount = computed(() => props.entries.length)

const page = ref(1)
const pageSize = ref(10)

function exportDrilldown(format: 'pdf' | 'excel'): void {
  emit('export', format, visibleColumns.value)
}

// A different line (or a reopen) starts back at page one.
watch(
  () => [props.account, open.value] as const,
  () => {
    page.value = 1
  }
)

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const rows = ledgerRows(
    props.entries.slice(start, start + pageSize.value),
    props.instances ?? NO_POCKET_INSTANCES
  )
  const account = props.balance?.account
  if (!account) return rows

  // Entries read oldest-first: the page opens on what the account was left
  // standing at by everything above it — the balance carried into the window
  // plus the pages already turned. Scoped to the drilled deployment, so a
  // redeployed pocket's line reconciles (a Bank → Bank move counts on one side).
  const scope = props.balance?.scope
  const opening = props.balance?.opening ?? NO_OPENING
  const carried = opening.balance + scopedNet(props.entries.slice(0, start), account, scope)
  const walked = withRunningBalance(rows, account, carried, scope)
  // The "Opening balance" line heads the ledger, so it belongs to page one.
  return start === 0 ? [openingRow(opening), ...walked] : walked
})
</script>
