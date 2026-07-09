<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <AccountingExportBar @export="onExport" @print="onPrint" />
    </div>

    <UCard class="w-full">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span
              class="bg-success/10 text-success flex size-7 items-center justify-center rounded-lg"
            >
              <UIcon name="i-heroicons-arrow-trending-up" class="size-4.5" />
            </span>
            <span class="text-[15px] font-semibold">Income statement</span>
          </div>
          <AccountingDatePicker
            v-model="period"
            mode="range"
            storage-key="cnc-accounting-income-period"
          />
        </div>
      </template>

      <div>
        <p class="text-dimmed pt-2 pb-1 text-[11px] font-bold tracking-wider uppercase">Revenue</p>
        <div
          v-for="r in income.revLines"
          :key="r.label"
          class="border-default/60 flex items-center justify-between border-b py-2"
        >
          <span class="text-sm">{{ r.label }}</span>
          <span class="text-success text-sm font-semibold tabular-nums">{{ r.value }}</span>
        </div>
        <p v-if="!income.revLines.length" class="text-dimmed py-2 text-sm">
          No revenue this period
        </p>
        <div class="flex items-center justify-between py-2.5">
          <span class="text-sm font-bold">Total revenue</span>
          <span class="text-sm font-bold tabular-nums">{{ income.totalRevenue }}</span>
        </div>

        <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">Expenses</p>
        <div
          v-for="e in income.expLines"
          :key="e.label"
          class="border-default/60 flex items-center justify-between border-b py-2"
        >
          <span class="text-sm">{{ e.label }}</span>
          <span class="text-sm font-semibold tabular-nums">{{ e.value }}</span>
        </div>
        <p v-if="!income.expLines.length" class="text-dimmed py-2 text-sm">
          No expenses this period
        </p>
        <div class="flex items-center justify-between py-2.5">
          <span class="text-sm font-bold">Total expenses</span>
          <span class="text-sm font-bold tabular-nums">{{ income.totalExpenses }}</span>
        </div>

        <div
          class="mt-3 flex items-center justify-between rounded-xl px-4 py-3.5"
          :class="income.netNegative ? 'bg-error/5' : 'bg-primary/5'"
        >
          <span
            class="text-sm font-bold"
            :class="income.netNegative ? 'text-error' : 'text-primary'"
          >
            Net income ({{ income.netNegative ? 'loss' : 'profit' }})
          </span>
          <span
            class="text-lg font-extrabold tabular-nums"
            :class="income.netNegative ? 'text-error' : 'text-primary'"
            >{{ income.netIncome }}</span
          >
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import { defaultValueForMode, isAllTimeRange, type Range } from '@/utils/datePicker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { presentIncome } from '@/utils/accounting/presenter'
import { exportFilename } from '@/utils/accounting/exportNaming'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

// Reporting period (range mode) — defaults to "All time".
const period = ref<Range>(defaultValueForMode('range') as Range)

const acc = useAccountingContext()
const income = computed(() =>
  presentIncome(acc.entries.value, period.value.start, period.value.end)
)

// Export the current, period-filtered statement. Pass null bounds for "All time"
// (whose range is epoch → today, not a user choice) so the heading and filename
// read "All time" rather than a spurious "Jan 1, 1970 – …" window.
const { exportPdf, exportExcel } = useAccountingExport()
const dateSelected = computed(() => !isAllTimeRange(period.value))
const spec = (): SectionSpec => ({
  key: 'income',
  from: dateSelected.value ? period.value.start : null,
  to: dateSelected.value ? period.value.end : null
})
const onExport = () => {
  const s = spec()
  exportExcel([s], exportFilename(s, 'xlsx'), 'Income statement exported to Excel')
}
const onPrint = () => {
  const s = spec()
  exportPdf([s], { filename: exportFilename(s, 'pdf') }, 'Income statement exported to PDF')
}
</script>
