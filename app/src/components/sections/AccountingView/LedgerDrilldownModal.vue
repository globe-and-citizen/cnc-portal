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
              @click="emit('export', 'excel')"
            />
            <UButton
              color="neutral"
              size="sm"
              icon="i-heroicons-printer"
              label="PDF"
              data-test="drilldown-export-pdf"
              @click="emit('export', 'pdf')"
            />
          </div>
        </div>

        <LedgerTable
          :rows="pageRows"
          :total="total"
          :visible-columns="visibleColumns"
          :show-balance="!!balanceAccount"
          :closing-balance="closing"
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
import LedgerTable from './LedgerTable.vue'
import TablePagination from '@/components/TablePagination.vue'
import ColumnVisibilitySelect from '@/components/ColumnVisibilitySelect.vue'
import {
  ledgerRows,
  LEDGER_COLUMNS,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerPresenter'
import {
  accountNet,
  openingRow,
  withRunningBalance,
  NO_OPENING,
  type AccountOpening
} from '@/utils/accounting/accountLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const props = defineProps<{
  account: string
  total: string
  entries: LedgerEntry[]
  /** The one account being drilled — adds the running "Balance" column. Left
   *  empty for an aggregate line, whose accounts have no single natural side. */
  balanceAccount?: string
  /** What the account carries into the window — heads the ledger as its
   *  "Opening balance" line. */
  opening?: AccountOpening
  /** What the account is left standing at, once every posting is booked. */
  closing?: string
}>()

const open = defineModel<boolean>('open', { required: true })
// Which ledger columns to show — owned by the parent so the drill-down export
// matches what's on screen; defaults to all when left unbound.
const visibleColumns = defineModel<LedgerColumnKey[]>('columns', {
  default: () => LEDGER_COLUMNS.map((c) => c.value)
})
const emit = defineEmits<{ export: [format: 'pdf' | 'excel'] }>()

const columnItems = [...LEDGER_COLUMNS]

const entryCount = computed(() => props.entries.length)

const page = ref(1)
const pageSize = ref(10)

// A different line (or a reopen) starts back at page one.
watch(
  () => [props.account, open.value] as const,
  () => {
    page.value = 1
  }
)

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const rows = ledgerRows(props.entries.slice(start, start + pageSize.value))
  const account = props.balanceAccount
  if (!account) return rows

  // Entries read oldest-first: the page opens on what the account was left
  // standing at by everything above it — the balance carried into the window
  // plus the pages already turned.
  const opening = props.opening ?? NO_OPENING
  const carried = opening.balance + accountNet(props.entries.slice(0, start), account)
  const walked = withRunningBalance(rows, account, carried)
  // The "Opening balance" line heads the ledger, so it belongs to page one.
  return start === 0 ? [openingRow(opening), ...walked] : walked
})
</script>
