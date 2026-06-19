<template>
  <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
    <div class="border-default flex items-center gap-2.5 border-b px-5 py-4">
      <span class="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
        <UIcon name="i-heroicons-calculator" class="size-4.5" />
      </span>
      <span class="text-[15px] font-semibold">Trial balance</span>
      <UBadge
        color="success"
        variant="soft"
        icon="i-heroicons-check"
        label="In balance"
        class="ml-auto rounded-full"
      />
    </div>

    <UTable :data="tableRows" :columns="columns">
      <template #account-cell="{ row: { original: row } }">
        <span :class="row.isTotal ? 'font-extrabold' : 'font-semibold'">{{ row.account }}</span>
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
      <template #dr-header>
        <div class="text-right">Debit</div>
      </template>
      <template #dr-cell="{ row: { original: row } }">
        <div
          class="text-right tabular-nums"
          :class="[
            row.isTotal ? 'font-extrabold' : '',
            !row.isTotal && row.drMuted ? 'text-dimmed' : ''
          ]"
        >
          {{ row.dr }}
        </div>
      </template>
      <template #cr-header>
        <div class="text-right">Credit</div>
      </template>
      <template #cr-cell="{ row: { original: row } }">
        <div
          class="text-right tabular-nums"
          :class="[
            row.isTotal ? 'font-extrabold' : '',
            !row.isTotal && row.crMuted ? 'text-dimmed' : ''
          ]"
        >
          {{ row.cr }}
        </div>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { trialRows, trialTotal } from '@/utils/accountingDemo'

interface TrialTableRow {
  account: string
  nature: string
  natureClass: string
  dr: string
  cr: string
  drMuted: boolean
  crMuted: boolean
  isTotal: boolean
}

const tableRows: TrialTableRow[] = [
  ...trialRows.map((r) => ({ ...r, isTotal: false })),
  {
    account: 'Total',
    nature: '',
    natureClass: '',
    dr: trialTotal,
    cr: trialTotal,
    drMuted: false,
    crMuted: false,
    isTotal: true
  }
]

const columns: TableColumn<TrialTableRow>[] = [
  { accessorKey: 'account', header: 'Account' },
  { accessorKey: 'nature', header: 'Nature' },
  { accessorKey: 'dr', header: 'Debit' },
  { accessorKey: 'cr', header: 'Credit' }
]
</script>
