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
          <DatePicker v-model="period" mode="range" storage-key="cnc-accounting-income-period" />
        </div>
      </template>

      <div>
        <p class="text-dimmed pt-2 pb-1 text-[11px] font-bold tracking-wider uppercase">Revenue</p>
        <StatementLine
          v-for="line in income.revenueLines"
          :key="line.label"
          :line="line"
          value-class="text-success"
          data-test-prefix="income"
          @drilldown="openDrilldown"
        />
        <p v-if="!income.revenueLines.length" class="text-dimmed py-2 text-sm">
          No revenue this period
        </p>
        <div class="flex items-center justify-between py-4">
          <span class="text-sm font-bold">Total revenue</span>
          <span class="text-sm font-bold tabular-nums">{{ income.totalRevenue }}</span>
        </div>

        <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">Expenses</p>
        <StatementLine
          v-for="line in income.expenseLines"
          :key="line.label"
          :line="line"
          data-test-prefix="income"
          @drilldown="openDrilldown"
        />
        <p v-if="!income.expenseLines.length" class="text-dimmed py-2 text-sm">
          No expenses this period
        </p>
        <div class="flex items-center justify-between py-4">
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

    <LedgerDrilldownModal
      v-model:open="drilldownOpen"
      :account="drilldownLine?.label ?? ''"
      :total="drilldownLine?.total ?? ''"
      :entries="drilldownEntries"
      :balance="drilldownBalance"
      :instances="drilldownInstances"
      columns-storage-key="cnc-accounting-income-drilldown-columns-v1"
      @export="onDrilldownExport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DatePicker from '@/components/ui/DatePicker.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import StatementLine from './StatementLine.vue'
import LedgerDrilldownModal from './LedgerDrilldownModal.vue'
import { defaultValueForMode, isAllTimeRange, type Range } from '@/utils/dates/picker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useSectionExport } from '@/composables/accounting/useSectionExport'
import { useLedgerDrilldown } from '@/composables/accounting/useLedgerDrilldown'
import { presentIncome, type StatementLineView } from '@/utils/accounting/presenter'

// Reporting period (range mode) — defaults to "All time".
const period = ref<Range>(defaultValueForMode('range') as Range)

const accounting = useAccountingContext()
const income = computed(() =>
  presentIncome(accounting.entries.value, period.value.start, period.value.end)
)

// A real date window is in play only when the picker isn't on "All time" (whose
// bounds are epoch → today, not a user choice); "All time" drills the whole book.
const dateSelected = computed(() => !isAllTimeRange(period.value))

// Per-line drill-down — over the same reporting period the statement shows.
const {
  open: drilldownOpen,
  selectedLine: drilldownLine,
  balance: drilldownBalance,
  drilldownEntries,
  instances: drilldownInstances,
  openFor,
  onExport: onDrilldownExport
} = useLedgerDrilldown(accounting.entries, () => ({
  from: dateSelected.value ? period.value.start : null,
  to: dateSelected.value ? period.value.end : null
}))

function openDrilldown(line: StatementLineView): void {
  if (line.account) openFor(line.account, line.value)
}

// Export the current, period-filtered statement. Pass null bounds for "All time"
// (whose range is epoch → today, not a user choice) so the heading and filename
// read "All time" rather than a spurious "Jan 1, 1970 – …" window.
const { onExport, onPrint } = useSectionExport('Income statement', () => ({
  key: 'income',
  from: dateSelected.value ? period.value.start : null,
  to: dateSelected.value ? period.value.end : null
}))
</script>
