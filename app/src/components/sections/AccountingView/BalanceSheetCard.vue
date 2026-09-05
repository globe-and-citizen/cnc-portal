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
          <DatePicker v-model="asOf" mode="date" storage-key="cnc-accounting-balance-asof" />
        </div>
      </template>

      <div>
        <p class="text-dimmed pt-2 pb-1 text-[11px] font-bold tracking-wider uppercase">Assets</p>
        <StatementLine
          v-for="line in balance.assetLines"
          :key="line.label"
          :line="line"
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
          v-for="line in balance.liabilityLines"
          :key="line.label"
          :line="line"
          label-class="text-muted"
          value-class="text-muted"
          data-test-prefix="balance"
          @drilldown="openDrilldown"
        />

        <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">Equity</p>
        <StatementLine
          v-for="line in balance.equityLines"
          :key="line.label"
          :line="line"
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
      :account="drilldownLine?.label ?? ''"
      :total="drilldownLine?.total ?? ''"
      :entries="drilldownEntries"
      :balance="drilldownBalance"
      :instances="drilldownInstances"
      columns-storage-key="cnc-accounting-balance-drilldown-columns-v1"
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
import { defaultValueForMode } from '@/utils/dates/picker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useSectionExport } from '@/composables/accounting/useSectionExport'
import { useLedgerDrilldown } from '@/composables/accounting/useLedgerDrilldown'
import { presentBalance, type StatementLineView } from '@/utils/accounting/presenter'

// Point-in-time "as of" date (date mode) — defaults to end of today.
const asOf = ref<Date>(defaultValueForMode('date') as Date)

const accounting = useAccountingContext()
const balance = computed(() => presentBalance(accounting.journal.value, asOf.value))

// Per-line drill-down — over the same as-of slice the balance sheet is built from.
const {
  open: drilldownOpen,
  selectedLine: drilldownLine,
  balance: drilldownBalance,
  drilldownEntries,
  instances: drilldownInstances,
  openFor,
  onExport: onDrilldownExport
} = useLedgerDrilldown(accounting.entries, () => ({ from: null, to: asOf.value }))

function openDrilldown(line: StatementLineView): void {
  // Retained earnings is an aggregate of every income + expense account; other
  // lines drill into their single account.
  if (line.accounts?.length) openFor(line.accounts, line.value, 'Retained earnings')
  else if (line.account) openFor(line.account, line.value)
}

// Export the current, as-of-filtered balance sheet. The filename carries the
// "as of" date so a stack of exports stays distinguishable.
const { onExport, onPrint } = useSectionExport('Balance sheet', () => ({
  key: 'balance',
  asOf: asOf.value
}))
</script>
