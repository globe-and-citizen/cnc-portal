<template>
  <UTable
    :data="tableRows"
    :columns="columns"
    :column-sizing-options="{ enableColumnResizing: true, columnResizeMode: 'onChange' }"
  >
    <template #date-cell="{ row: { original: row } }">
      <span
        v-if="row.isFirst && !row.isTotal"
        class="text-muted text-sm whitespace-nowrap tabular-nums"
      >
        {{ row.date }}
      </span>
    </template>

    <template #action-cell="{ row: { original: row } }">
      <!-- A fee leg reads as its own action ("Fee"), on the same footing as the
           category pills (Expense / Transfer / …) — even on a continuation row. -->
      <span
        v-if="row.isFee"
        class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
        :class="FEE_BADGE"
      >
        Fee
      </span>
      <span
        v-else-if="row.isFirst && !row.isTotal"
        class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
        :class="row.categoryClass"
      >
        {{ row.category }}
      </span>
    </template>

    <template #transaction-cell="{ row: { original: row } }">
      <span v-if="row.isTotal" class="font-extrabold">Total movements</span>
      <span v-else-if="row.isFirst" class="text-sm font-semibold">{{ row.label }}</span>
    </template>

    <template
      v-for="header in RESIZABLE_HEADERS"
      :key="header.value"
      #[`${header.value}-header`]="{ column, table }"
    >
      <LedgerColumnHeader
        :column-key="header.value"
        :label="header.label"
        :column="column"
        :table="table"
        :align-end="isNumericColumn(header.value)"
      />
    </template>

    <template #txHash-cell="{ row: { original: row } }">
      <UTooltip
        v-if="row.isFirst && !row.isTotal && row.txHash && transactionExplorerUrl(row.txHash)"
        text="Open transaction in block explorer"
      >
        <a
          class="text-muted hover:text-primary focus-visible:ring-primary rounded font-mono text-xs whitespace-nowrap underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:ring-2 focus-visible:outline-none"
          :href="transactionExplorerUrl(row.txHash)"
          :title="row.txHash"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Open transaction ${row.txHash} in block explorer`"
          data-test="ledger-tx-hash"
        >
          {{ formatTxHash(row.txHash) }}
        </a>
      </UTooltip>
      <span
        v-else-if="row.isFirst && !row.isTotal"
        class="text-muted font-mono text-xs whitespace-nowrap"
        :title="row.txHash || undefined"
        data-test="ledger-tx-hash"
      >
        {{ row.txHash ? formatTxHash(row.txHash) : '—' }}
      </span>
    </template>

    <template #activity-cell="{ row: { original: row } }">
      <LedgerActivityCell
        v-if="!row.isTotal && (row.isFirst || activityHasContent(row.activity))"
        :activity="row.activity"
        :destination="row.destination"
        :linkable="!!routeFor(row.destination)"
        @open="open(row.destination)"
      />
    </template>

    <template #account-cell="{ row: { original: row } }">
      <div v-if="!row.isTotal" class="flex items-center gap-1.5">
        <button
          v-if="linkAccount && !row.accountDimmed && row.account"
          type="button"
          class="focus-visible:ring-neutral rounded text-sm tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:ring-2 focus-visible:outline-none"
          :class="row.accountMuted ? 'text-muted' : 'text-default'"
          :data-test="`ledger-account-link-${row.account}`"
          @click="selectAccount(row)"
        >
          {{ row.accountLabel ?? row.account }}
        </button>
        <span
          v-else
          class="text-sm tabular-nums"
          :class="
            row.accountDimmed ? 'text-dimmed' : row.accountMuted ? 'text-muted' : 'text-default'
          "
        >
          {{ row.accountLabel ?? row.account }}
        </span>
        <UTooltip
          v-if="(row.instanceNumber ?? 1) > 1"
          :text="REDEPLOY_HINT"
          :data-test="`ledger-redeploy-hint-${row.accountLabel}`"
        >
          <UIcon
            name="i-heroicons-information-circle"
            class="text-warning size-4 shrink-0 cursor-help"
          />
        </UTooltip>
      </div>
    </template>

    <template #currency-cell="{ row: { original: row } }">
      <span v-if="!row.isTotal" class="text-muted text-sm">{{ row.currency }}</span>
    </template>

    <template #quantity-cell="{ row: { original: row } }">
      <div v-if="!row.isTotal" class="text-muted text-right text-sm tabular-nums">
        {{ row.quantity }}
      </div>
    </template>

    <template #rate-cell="{ row: { original: row } }">
      <div v-if="!row.isTotal" class="text-muted text-right text-sm tabular-nums">
        {{ row.rate }}
      </div>
    </template>

    <template #dr-cell="{ row: { original: row } }">
      <div
        class="text-right text-sm tabular-nums"
        :class="row.isTotal ? 'font-extrabold' : 'font-semibold'"
      >
        {{ row.dr }}
      </div>
    </template>

    <template #cr-cell="{ row: { original: row } }">
      <div
        class="text-right text-sm tabular-nums"
        :class="row.isTotal ? 'font-extrabold' : 'font-semibold'"
      >
        {{ row.cr }}
      </div>
    </template>

    <template #balance-cell="{ row: { original: row } }">
      <div
        class="text-right text-sm tabular-nums"
        :class="row.isTotal ? 'text-highlighted font-extrabold' : 'text-muted font-semibold'"
        data-test="ledger-balance"
      >
        {{ row.isTotal ? (closingBalance ?? total) : row.balance }}
      </div>
    </template>
  </UTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import LedgerActivityCell from './LedgerActivityCell.vue'
import LedgerColumnHeader from './LedgerColumnHeader.vue'
import { useActivityDestination } from '@/composables/accounting/useActivityDestination'
import { NETWORK } from '@/constant'
import { formatTxHash } from '@/utils/format'
import {
  LEDGER_COLUMNS,
  type LedgerRow,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerPresenter'

const props = defineProps<{
  rows: LedgerRow[]
  total: string
  /** Column keys to show; omit to show them all. */
  visibleColumns?: LedgerColumnKey[]
  /** Append the running "Balance" column after Credit (single-account ledgers). */
  showBalance?: boolean
  /** What the account is left standing at — the foot of the Balance column.
   *  Defaults to `total` when the ledger carries nothing forward. */
  closingBalance?: string
  /** Render each real account name as a link that emits `accountSelect` (the
   *  General Ledger uses this to jump to that account's Trial Balance drill-down).
   *  Off by default so the drill-down modal's own ledger stays plain text. */
  linkAccount?: boolean
}>()

const emit = defineEmits<{
  accountSelect: [account: string, instance?: string, accountId?: string]
}>()

// Shown beside a leg posted to a redeployed pocket's later contract — the same
// explanation the trial balance gives on its numbered lines.
const REDEPLOY_HINT =
  'This account was redeployed to a new contract. This posting moved that later deployment.'

type LedgerTableRow = LedgerRow & { isTotal: boolean }

// Action-pill classes for a fee leg — amber, a peer of the category badges
// (CATEGORY_BADGE in ledgerPresenter). A static string so Tailwind keeps it.
const FEE_BADGE = 'bg-warning/10 text-warning'

type ResizableColumnKey = LedgerColumnKey | 'balance'

interface ColumnSize {
  size: number
  minSize: number
  maxSize: number
}

const COLUMN_SIZES: Record<ResizableColumnKey, ColumnSize> = {
  date: { size: 160, minSize: 120, maxSize: 280 },
  action: { size: 120, minSize: 90, maxSize: 220 },
  transaction: { size: 180, minSize: 130, maxSize: 320 },
  txHash: { size: 180, minSize: 140, maxSize: 480 },
  activity: { size: 320, minSize: 180, maxSize: 640 },
  account: { size: 200, minSize: 140, maxSize: 420 },
  currency: { size: 100, minSize: 80, maxSize: 180 },
  quantity: { size: 120, minSize: 90, maxSize: 240 },
  rate: { size: 100, minSize: 80, maxSize: 200 },
  dr: { size: 120, minSize: 90, maxSize: 240 },
  cr: { size: 120, minSize: 90, maxSize: 240 },
  balance: { size: 130, minSize: 100, maxSize: 280 }
}

const NUMERIC_COLUMNS = new Set<ResizableColumnKey>(['quantity', 'rate', 'dr', 'cr', 'balance'])
const RESIZABLE_HEADERS = [...LEDGER_COLUMNS, { value: 'balance' as const, label: 'Balance' }]

// "Where did this happen?" — resolved once for the table, so each Activity cell
// only has to say whether it is clickable.
const { routeFor, open } = useActivityDestination()

/**
 * Whether an Activity cell carries something to show — an actor or a transfer
 * always does; a plain cell only when it has text. Lets an itemized posting narrate
 * each line (e.g. every beneficiary of a grouped dividend), not just the lead row,
 * while the head-only cells (Date / Action / Transaction) stay gated on `isFirst`.
 */
function activityHasContent(activity: LedgerRow['activity']): boolean {
  return activity.kind !== 'plain' || activity.text.trim() !== ''
}

function transactionExplorerUrl(txHash: string): string | undefined {
  if (!NETWORK.blockExplorerUrl) return undefined
  return `${NETWORK.blockExplorerUrl.replace(/\/$/, '')}/tx/${txHash}`
}

function isNumericColumn(column: ResizableColumnKey): boolean {
  return NUMERIC_COLUMNS.has(column)
}

/** Forward the concrete journal identity when it is available. */
function selectAccount(row: LedgerRow): void {
  if (row.accountId) emit('accountSelect', row.account, row.accountInstance, row.accountId)
  else emit('accountSelect', row.account, row.accountInstance)
}

function columnStyle(column: {
  getSize: () => number
  columnDef: { minSize?: number; maxSize?: number }
}): Record<string, string> {
  const width = `${column.getSize()}px`
  return {
    width,
    minWidth: `${column.columnDef.minSize ?? 80}px`,
    maxWidth: `${column.columnDef.maxSize ?? 640}px`
  }
}

function resizableColumn(
  column: TableColumn<LedgerTableRow>,
  key: ResizableColumnKey
): TableColumn<LedgerTableRow> {
  const sizing = COLUMN_SIZES[key]
  return {
    ...column,
    ...sizing,
    enableResizing: true,
    meta: {
      style: {
        th: (header) => columnStyle(header.column),
        td: (cell) => columnStyle(cell.column)
      }
    }
  }
}

const tableRows = computed<LedgerTableRow[]>(() => [
  ...props.rows.map((row) => ({ ...row, isTotal: false })),
  {
    isFirst: false,
    date: '',
    label: '',
    activity: { kind: 'plain', text: '' } as const,
    category: '',
    categoryClass: '',
    account: '',
    accountMuted: false,
    accountDimmed: false,
    dr: props.total,
    cr: props.total,
    currency: '',
    quantity: '',
    rate: '',
    isTotal: true
  }
])

// Data columns bind to a row field (accessorKey); slot-only columns use an id.
// Every column also has a `<key>-cell` template, so the key drives both.
const COLUMN_DEFS: Record<LedgerColumnKey, TableColumn<LedgerTableRow>> = {
  date: resizableColumn({ accessorKey: 'date', header: 'Date' }, 'date'),
  action: resizableColumn({ id: 'action', header: 'Action' }, 'action'),
  transaction: resizableColumn({ id: 'transaction', header: 'Transaction' }, 'transaction'),
  txHash: resizableColumn({ accessorKey: 'txHash', header: 'Tx hash' }, 'txHash'),
  activity: resizableColumn({ id: 'activity', header: 'Activity' }, 'activity'),
  account: resizableColumn({ accessorKey: 'account', header: 'Account' }, 'account'),
  dr: resizableColumn({ accessorKey: 'dr', header: 'Debit' }, 'dr'),
  cr: resizableColumn({ accessorKey: 'cr', header: 'Credit' }, 'cr'),
  currency: resizableColumn({ accessorKey: 'currency', header: 'Currency' }, 'currency'),
  quantity: resizableColumn({ accessorKey: 'quantity', header: 'Quantity' }, 'quantity'),
  rate: resizableColumn({ accessorKey: 'rate', header: 'Rate' }, 'rate')
}

// The running balance closes the table, right after Credit. It isn't a
// LEDGER_COLUMNS entry: it only exists for a single account's ledger (the
// drill-down), so it's neither toggleable nor exported.
const BALANCE_COLUMN = resizableColumn({ accessorKey: 'balance', header: 'Balance' }, 'balance')

const columns = computed<TableColumn<LedgerTableRow>[]>(() => {
  const visible = props.visibleColumns ?? LEDGER_COLUMNS.map((column) => column.value)
  const shown = LEDGER_COLUMNS.filter((column) => visible.includes(column.value)).map(
    (column) => COLUMN_DEFS[column.value]
  )
  return props.showBalance ? [...shown, BALANCE_COLUMN] : shown
})
</script>
