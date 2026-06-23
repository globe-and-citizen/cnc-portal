<template>
  <UTable :data="tableRows" :columns="columns">
    <template #date-cell="{ row: { original: row } }">
      <span
        v-if="row.isFirst && !row.isTotal"
        class="text-muted text-xs whitespace-nowrap tabular-nums"
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
      <span v-else-if="row.isFirst" class="text-[13px] font-semibold">{{ row.label }}</span>
    </template>

    <template #account-cell="{ row: { original: row } }">
      <span
        v-if="!row.isTotal"
        class="text-xs tabular-nums"
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
        class="text-right text-xs tabular-nums"
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
        class="text-right text-xs tabular-nums"
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
import type { LedgerRow } from '@/utils/accounting/ledgerPresenter'

const props = defineProps<{ rows: LedgerRow[]; total: string }>()

type LedgerTableRow = LedgerRow & { isTotal: boolean }

const tableRows = computed<LedgerTableRow[]>(() => [
  ...props.rows.map((r) => ({ ...r, isTotal: false })),
  {
    isFirst: false,
    date: '',
    label: '',
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

const columns: TableColumn<LedgerTableRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { id: 'action', header: 'Action' },
  { id: 'transaction', header: 'Transaction' },
  { accessorKey: 'account', header: 'Account' },
  { accessorKey: 'dr', header: 'Debit' },
  { accessorKey: 'cr', header: 'Credit' }
]
</script>
