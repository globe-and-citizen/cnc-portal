<template>
  <UTable :data="tableRows" :columns="columns">
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
        :class="row.catClass"
      >
        {{ row.cat }}
      </span>
    </template>

    <template #transaction-cell="{ row: { original: row } }">
      <span v-if="row.isTotal" class="font-extrabold">Total movements</span>
      <span v-else-if="row.isFirst" class="text-sm font-semibold">{{ row.label }}</span>
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
      <button
        v-if="!row.isTotal && linkAccount && !row.accountDimmed && row.account"
        type="button"
        class="focus-visible:ring-neutral rounded text-sm tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:ring-2 focus-visible:outline-none"
        :class="row.accountMuted ? 'text-muted' : 'text-default'"
        :data-test="`ledger-account-link-${row.account}`"
        @click="emit('accountSelect', row.account, row.accountInstance)"
      >
        {{ row.accountLabel ?? row.account }}
      </button>
      <span
        v-else-if="!row.isTotal"
        class="text-sm tabular-nums"
        :class="
          row.accountDimmed ? 'text-dimmed' : row.accountMuted ? 'text-muted' : 'text-default'
        "
      >
        {{ row.accountLabel ?? row.account }}
      </span>
      <UTooltip
        v-if="!row.isTotal && (row.instanceNumber ?? 1) > 1"
        :text="REDEPLOY_HINT"
        :data-test="`ledger-redeploy-hint-${row.accountLabel}`"
      >
        <UIcon
          name="i-heroicons-information-circle"
          class="text-warning ml-1 size-4 shrink-0 cursor-help align-text-bottom"
        />
      </UTooltip>
    </template>

    <template #currency-cell="{ row: { original: row } }">
      <span v-if="!row.isTotal" class="text-muted text-sm">{{ row.currency }}</span>
    </template>

    <template #quantity-header>
      <div class="text-right">Quantity</div>
    </template>
    <template #quantity-cell="{ row: { original: row } }">
      <div v-if="!row.isTotal" class="text-muted text-right text-sm tabular-nums">
        {{ row.quantity }}
      </div>
    </template>

    <template #rate-header>
      <div class="text-right">Rate</div>
    </template>
    <template #rate-cell="{ row: { original: row } }">
      <div v-if="!row.isTotal" class="text-muted text-right text-sm tabular-nums">
        {{ row.rate }}
      </div>
    </template>

    <template #dr-header>
      <div class="text-right">Debit</div>
    </template>
    <template #dr-cell="{ row: { original: row } }">
      <div
        class="text-right text-sm tabular-nums"
        :class="row.isTotal ? 'font-extrabold' : 'font-semibold'"
      >
        {{ row.dr }}
      </div>
    </template>

    <template #cr-header>
      <div class="text-right">Credit</div>
    </template>
    <template #cr-cell="{ row: { original: row } }">
      <div
        class="text-right text-sm tabular-nums"
        :class="row.isTotal ? 'font-extrabold' : 'font-semibold'"
      >
        {{ row.cr }}
      </div>
    </template>

    <template #balance-header>
      <div class="text-right">Balance</div>
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
import { useActivityDestination } from '@/composables/accounting/useActivityDestination'
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

const emit = defineEmits<{ accountSelect: [account: string, instance?: string] }>()

// Shown beside a leg posted to a redeployed pocket's later contract — the same
// explanation the trial balance gives on its numbered lines.
const REDEPLOY_HINT =
  'This account was redeployed to a new contract. This posting moved that later deployment.'

type LedgerTableRow = LedgerRow & { isTotal: boolean }

// Action-pill classes for a fee leg — amber, a peer of the category badges
// (CATEGORY_BADGE in ledgerPresenter). A static string so Tailwind keeps it.
const FEE_BADGE = 'bg-warning/10 text-warning'

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

const tableRows = computed<LedgerTableRow[]>(() => [
  ...props.rows.map((r) => ({ ...r, isTotal: false })),
  {
    isFirst: false,
    date: '',
    label: '',
    activity: { kind: 'plain', text: '' } as const,
    cat: '',
    catClass: '',
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
  date: { accessorKey: 'date', header: 'Date' },
  action: { id: 'action', header: 'Action' },
  transaction: { id: 'transaction', header: 'Transaction' },
  activity: { id: 'activity', header: 'Activity' },
  account: { accessorKey: 'account', header: 'Account' },
  dr: { accessorKey: 'dr', header: 'Debit' },
  cr: { accessorKey: 'cr', header: 'Credit' },
  currency: { accessorKey: 'currency', header: 'Currency' },
  quantity: { accessorKey: 'quantity', header: 'Quantity' },
  rate: { accessorKey: 'rate', header: 'Rate' }
}

// The running balance closes the table, right after Credit. It isn't a
// LEDGER_COLUMNS entry: it only exists for a single account's ledger (the
// drill-down), so it's neither toggleable nor exported.
const BALANCE_COLUMN: TableColumn<LedgerTableRow> = { accessorKey: 'balance', header: 'Balance' }

const columns = computed<TableColumn<LedgerTableRow>[]>(() => {
  const visible = props.visibleColumns ?? LEDGER_COLUMNS.map((c) => c.value)
  const shown = LEDGER_COLUMNS.filter((c) => visible.includes(c.value)).map(
    (c) => COLUMN_DEFS[c.value]
  )
  return props.showBalance ? [...shown, BALANCE_COLUMN] : shown
})
</script>
