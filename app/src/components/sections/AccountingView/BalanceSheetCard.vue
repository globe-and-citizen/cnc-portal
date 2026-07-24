<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <AccountingExportBar @export="onExport" @print="onPrint" />
    </div>

    <UCard class="w-full">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="bg-info/10 text-info flex size-7 items-center justify-center rounded-lg">
              <UIcon name="i-heroicons-scale" class="size-4.5" />
            </span>
            <span class="text-[15px] font-semibold">Balance sheet</span>
          </div>
          <AccountingDatePicker
            v-model="asOf"
            mode="date"
            storage-key="cnc-accounting-balance-asof"
          />
        </div>
      </template>

      <div>
        <p class="text-dimmed pt-2 pb-1 text-[11px] font-bold tracking-wider uppercase">Assets</p>
        <StatementLine
          v-for="a in balance.assetLines"
          :key="a.label"
          :line="a"
          data-test-prefix="balance"
          @drilldown="openDrilldown"
        />
        <div class="flex items-center justify-between py-4">
          <span class="text-sm font-bold">Total assets</span>
          <span class="text-sm font-bold tabular-nums">{{ balance.totalAssets }}</span>
        </div>

        <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">
          Liabilities
        </p>
        <StatementLine
          v-for="l in balance.liabLines"
          :key="l.label"
          :line="l"
          label-class="text-muted"
          value-class="text-muted"
          data-test-prefix="balance"
          @drilldown="openDrilldown"
        />

        <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">Equity</p>
        <StatementLine
          v-for="q in balance.equityLines"
          :key="q.label"
          :line="q"
          data-test-prefix="balance"
          @drilldown="openDrilldown"
        />
        <div class="flex items-center justify-between py-4">
          <span class="text-sm font-bold">Total equity</span>
          <span class="text-sm font-bold tabular-nums">{{ balance.totalEquity }}</span>
        </div>

        <div class="bg-info/10 mt-3 flex items-center justify-between rounded-xl px-4 py-3.5">
          <span class="text-info text-sm font-bold">Liabilities + Equity</span>
          <span class="text-info text-lg font-extrabold tabular-nums">{{
            balance.liabilitiesPlusEquity
          }}</span>
        </div>
      </div>
    </UCard>

    <LedgerDrilldownModal
      v-model:open="drilldownOpen"
      v-model:columns="drilldownColumns"
      :account="drilldownAccount"
      :total="drilldownTotal"
      :entries="drilldownEntries"
      @export="onDrilldownExport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import StatementLine from './StatementLine.vue'
import LedgerDrilldownModal from './LedgerDrilldownModal.vue'
import { defaultValueForMode } from '@/utils/datePicker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { useLedgerDrilldown } from '@/composables/accounting/useLedgerDrilldown'
import { presentBalance, type StatementLineView } from '@/utils/accounting/presenter'
import { exportFilename } from '@/utils/accounting/exportNaming'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

// Point-in-time "as of" date (date mode) — defaults to end of today.
const asOf = ref<Date>(defaultValueForMode('date') as Date)

const acc = useAccountingContext()
const balance = computed(() => presentBalance(acc.entries.value, asOf.value))

// Per-line drill-down — over the same as-of slice the balance sheet is built from.
const {
  open: drilldownOpen,
  account: drilldownAccount,
  total: drilldownTotal,
  columns: drilldownColumns,
  drilldownEntries,
  openFor,
  onExport: onDrilldownExport
} = useLedgerDrilldown(
  acc.entries,
  () => ({ from: null, to: asOf.value }),
  'cnc-accounting-balance-drilldown-columns-v1'
)

function openDrilldown(line: StatementLineView): void {
  // Retained earnings is an aggregate of every income + expense account; other
  // lines drill into their single account.
  if (line.accounts?.length) openFor(line.accounts, line.value, 'Retained earnings')
  else if (line.account) openFor(line.account, line.value)
}

// Export the current, as-of-filtered balance sheet. The filename carries the
// "as of" date so a stack of exports stays distinguishable.
const { exportPdf, exportExcel } = useAccountingExport()
const spec = (): SectionSpec => ({ key: 'balance', asOf: asOf.value })
const onExport = () => {
  const s = spec()
  exportExcel([s], exportFilename(s, 'xlsx'), 'Balance sheet exported to Excel')
}
const onPrint = () => {
  const s = spec()
  exportPdf([s], { filename: exportFilename(s, 'pdf') }, 'Balance sheet exported to PDF')
}
</script>
