<template>
  <section class="border-default overflow-hidden rounded-xl border" :data-test="dataTest">
    <h3 class="bg-elevated/40 px-4 py-3 text-sm font-bold">{{ title }}</h3>
    <UTable
      :data="tableRows"
      :columns="columns"
      :ui="{ tr: 'group' }"
      :meta="{ class: { tr: rowClass } }"
      @select="onRowSelect"
    >
      <template #account-cell="{ row: { original: row } }">
        <span v-if="row.isTotal" class="font-extrabold">{{ row.label }}</span>
        <div v-else class="flex w-full items-center justify-between gap-3">
          <button
            v-if="isDrillable(row)"
            type="button"
            class="focus-visible:ring-neutral truncate rounded text-left font-semibold focus-visible:ring-2 focus-visible:outline-none"
            :data-test="`${dataTest}-drilldown-${rowKey(row)}`"
            @click.stop="openDrilldown(row)"
          >
            {{ row.label }}
          </button>
          <span v-else class="font-semibold">{{ row.label }}</span>
          <span
            v-if="isDrillable(row)"
            class="bg-neutral/10 text-neutral inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            <UIcon name="i-heroicons-magnifying-glass" class="size-3.5" />
            Details
          </span>
        </div>
      </template>

      <template #nature-cell="{ row: { original: row } }">
        <span
          v-if="!row.isTotal"
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="row.natureClass"
        >
          {{ row.nature }}
        </span>
      </template>

      <template #value-header>
        <div class="text-right">{{ valueLabel }}</div>
      </template>
      <template #value-cell="{ row: { original: row } }">
        <div class="text-right tabular-nums" :class="row.isTotal ? 'font-extrabold' : ''">
          {{ row.value }}
        </div>
      </template>
    </UTable>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { BalanceLineView } from '@/utils/accounting/presenter'

interface Props {
  title: string
  rows: BalanceLineView[]
  totalLabel: string
  total: string
  dataTest: string
  valueLabel?: string
}

interface BalanceTableRow extends BalanceLineView {
  isTotal: boolean
}

const props = defineProps<Props>()
const valueLabel = computed(() => props.valueLabel ?? 'Balance')
const emit = defineEmits<{ drilldown: [line: BalanceLineView] }>()

const tableRows = computed<BalanceTableRow[]>(() => [
  ...props.rows.map((row) => ({ ...row, isTotal: false })),
  {
    label: props.totalLabel,
    value: props.total,
    nature: 'Equity',
    natureClass: '',
    isTotal: true
  }
])

const columns: TableColumn<BalanceTableRow>[] = [
  { id: 'account', accessorFn: (row) => row.label, header: 'Account' },
  { accessorKey: 'nature', header: 'Nature', meta: { class: { th: 'w-[24%]' } } },
  { accessorKey: 'value', header: 'Balance', meta: { class: { th: 'w-[18%]' } } }
]

function rowKey(row: BalanceTableRow): string {
  return typeof row.account === 'object' ? row.account.id : (row.account ?? 'earnings-to-date')
}

function isDrillable(row: BalanceTableRow): boolean {
  return Boolean(row.account || row.accounts?.length)
}

function rowClass(row: TableRow<BalanceTableRow>): string {
  return row.original.isTotal || !isDrillable(row.original)
    ? ''
    : 'cursor-pointer [&>td]:transition-colors [&:hover>td]:bg-elevated/60 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg'
}

function onRowSelect(_event: Event, row: TableRow<BalanceTableRow>): void {
  if (!row.original.isTotal && isDrillable(row.original)) openDrilldown(row.original)
}

function openDrilldown(row: BalanceTableRow): void {
  const line = props.rows.find(
    (candidate) => candidate.label === row.label && candidate.account === row.account
  )
  if (line) emit('drilldown', line)
}
</script>
