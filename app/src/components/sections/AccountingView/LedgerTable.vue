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
      <span
        v-if="row.isFirst && !row.isTotal"
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
      <div v-if="!row.isTotal && row.isFirst" class="flex items-center gap-1.5 text-sm">
        <template v-if="row.activity.kind === 'actor'">
          <UserComponent compact size="sm" hide-address :user="resolveUser(row.activity.actor)" />
          <span class="text-muted">{{ row.activity.text }}</span>
        </template>
        <template v-else-if="row.activity.kind === 'transfer'">
          <template v-if="row.activity.actor">
            <UserComponent compact size="sm" hide-address :user="resolveUser(row.activity.actor)" />
            <span class="text-muted">transferred money from</span>
            <UserComponent compact size="sm" hide-address :user="pocketUser(row.activity.from)" />
            <span class="text-muted">to</span>
            <UserComponent compact size="sm" hide-address :user="pocketUser(row.activity.to)" />
          </template>
          <template v-else>
            <UserComponent compact size="sm" hide-address :user="pocketUser(row.activity.from)" />
            <span class="text-muted">transferred money to</span>
            <UserComponent compact size="sm" hide-address :user="pocketUser(row.activity.to)" />
          </template>
        </template>
        <span v-else-if="row.activity.text" class="text-muted">{{ row.activity.text }}</span>
      </div>
    </template>

    <template #account-cell="{ row: { original: row } }">
      <span
        v-if="!row.isTotal"
        class="text-sm tabular-nums"
        :class="
          row.accountDimmed ? 'text-dimmed' : row.accountMuted ? 'text-muted' : 'text-default'
        "
      >
        {{ row.account }}
      </span>
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
  </UTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import UserComponent from '@/components/ui/UserComponent.vue'
import { resolveUser } from '@/utils/transactionHistoryUtil'
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
}>()

type LedgerTableRow = LedgerRow & { isTotal: boolean }

/** A cash pocket account rendered as a contract avatar (document icon + short name). */
function pocketUser(account: string) {
  return { name: account.replace('Cash — ', ''), address: '', icon: 'heroicons:document-text' }
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
  cr: { accessorKey: 'cr', header: 'Credit' }
}

const columns = computed<TableColumn<LedgerTableRow>[]>(() => {
  const visible = props.visibleColumns ?? LEDGER_COLUMNS.map((c) => c.value)
  return LEDGER_COLUMNS.filter((c) => visible.includes(c.value)).map((c) => COLUMN_DEFS[c.value])
})
</script>
