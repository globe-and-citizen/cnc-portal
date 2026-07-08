<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <AccountingExportBar @export="onExport" @print="onPrint" />
    </div>

    <UCard class="w-full">
      <template #header>
        <div class="flex flex-wrap items-center gap-2.5">
          <span
            class="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg"
          >
            <UIcon name="i-heroicons-calculator" class="size-4.5" />
          </span>
          <span class="text-[15px] font-semibold">Trial balance</span>
          <UBadge
            :color="trial.balanced ? 'success' : 'warning'"
            variant="soft"
            :icon="trial.balanced ? 'i-heroicons-check' : 'i-heroicons-exclamation-triangle'"
            :label="trial.balanced ? 'In balance' : 'Out of balance'"
            class="rounded-full"
          />
          <AccountingDatePicker
            v-model="asOf"
            mode="date"
            storage-key="cnc-accounting-trial-asof"
            class="ml-auto"
          />
        </div>
      </template>

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
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import { defaultValueForMode } from '@/utils/datePicker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { filterByPeriod, presentTrial } from '@/utils/accounting/presenter'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

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

// Point-in-time "as of" date (date mode) — defaults to end of today. The trial
// balance is rebuilt from the slice of entries up to this date.
const asOf = ref<Date>(defaultValueForMode('date') as Date)

const acc = useAccountingContext()
const trial = computed(() =>
  presentTrial(buildGeneralLedger(filterByPeriod(acc.entries.value, null, asOf.value)))
)

const tableRows = computed<TrialTableRow[]>(() => [
  ...trial.value.rows.map((r) => ({ ...r, isTotal: false })),
  {
    account: 'Total',
    nature: '',
    natureClass: '',
    dr: trial.value.total,
    cr: trial.value.total,
    drMuted: false,
    crMuted: false,
    isTotal: true
  }
])

const columns: TableColumn<TrialTableRow>[] = [
  { accessorKey: 'account', header: 'Account' },
  { accessorKey: 'nature', header: 'Nature' },
  { accessorKey: 'dr', header: 'Debit' },
  { accessorKey: 'cr', header: 'Credit' }
]

// Export the current, as-of-filtered trial balance.
const { exportPdf, exportExcel } = useAccountingExport()
const spec = (): SectionSpec => ({ key: 'trial', asOf: asOf.value })
const onExport = () =>
  exportExcel([spec()], 'trial-balance.xlsx', 'Trial balance exported to Excel')
const onPrint = () =>
  exportPdf([spec()], { filename: 'trial-balance.pdf' }, 'Trial balance exported to PDF')
</script>
