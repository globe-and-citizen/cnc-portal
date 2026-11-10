<template>
  <div class="flex flex-col gap-5">
    <!-- The period drives the cards below and the report exported from the modal. -->
    <div class="flex flex-wrap items-center justify-end gap-2.5">
      <DatePicker v-model="period" mode="range" :storage-key="periodStorageKey" />
      <ExportReportModal
        :ledger-entry-count="ledgerEntryCount"
        :period-label="periodLabel(bounds.from, bounds.to)"
        @generate="onGenerate"
      />
    </div>

    <!-- Balance-check banner -->
    <div
      class="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
      :class="banner.balanced ? 'bg-success/10' : 'bg-warning/10'"
      data-test="balance-banner"
    >
      <UIcon
        :name="banner.balanced ? 'i-heroicons-check-badge' : 'i-heroicons-exclamation-triangle'"
        class="size-5 shrink-0"
        :class="banner.balanced ? 'text-success' : 'text-warning'"
      />
      <div class="min-w-0 flex-1 text-sm">
        <span class="font-semibold" :class="banner.balanced ? 'text-success' : 'text-warning'">
          {{ banner.balanced ? 'Books are balanced' : 'Books are not balanced' }}
        </span>
        <span :class="banner.balanced ? 'text-success/90' : 'text-warning/90'">
          — Assets = Liabilities + Equity ·
        </span>
        <span
          class="font-bold tabular-nums"
          :class="banner.balanced ? 'text-success' : 'text-warning'"
        >
          {{ banner.identity }}
        </span>
      </div>
      <span
        class="text-xs tabular-nums"
        :class="banner.balanced ? 'text-success/80' : 'text-warning/80'"
        >{{ banner.trial }}</span
      >
    </div>

    <!-- Metric cards — 4 per row; the last row stretches to fill the width when
         "Debt repaid" is absent (7 cards → 4/3), and is a plain 4/4 when it shows. -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
      <div
        v-for="(card, index) in summaryCards"
        :key="card.label"
        class="border-default bg-default rounded-2xl border p-4.5 shadow-sm"
        :class="[card.accent ? [card.accentClass, 'border-t-[3px]'] : '', cardSpan(index)]"
        :data-test="`summary-${card.label}`"
      >
        <div class="flex items-center justify-between">
          <span class="flex size-8 items-center justify-center rounded-lg" :class="card.chipClass">
            <UIcon :name="card.icon" class="size-4.5" />
          </span>
          <span
            v-if="card.trend"
            class="bg-success/10 text-success rounded-full px-2 py-0.5 text-xs font-bold"
          >
            {{ card.trend }}
          </span>
        </div>
        <div class="text-muted mt-3.5 text-xs font-semibold">{{ card.label }}</div>
        <div class="mt-0.5 text-2xl font-bold tracking-tight" :class="card.valueClass">
          {{ card.value }}
        </div>
        <div class="text-dimmed mt-1 text-[11px] leading-snug">{{ card.sub }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import DatePicker from '@/components/ui/DatePicker.vue'
import ExportReportModal, {
  type ExportFormat
} from '@/components/sections/AccountingView/ExportReportModal.vue'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { exportFilename } from '@/utils/accounting/exportNaming'
import { filterByPeriod, periodLabel, presentSummary } from '@/utils/accounting/presenter'
import type { SectionKey, SectionSpec } from '@/utils/accounting/exportSpec'
import { defaultValueForMode, isAllTimeRange, type Range } from '@/utils/dates/picker'

const accounting = useAccountingContext()

// The period of the cards and of the exported report. The other Accounting pages
// keep their own dates.
const period = ref<Range>(defaultValueForMode('range') as Range)
const periodStorageKey = `cnc-accounting-${useRoute().params.id}-summary-period`
// "All time" starts at the epoch, which is not a user choice: it means no bounds.
const bounds = computed(() =>
  isAllTimeRange(period.value)
    ? { from: null, to: null }
    : { from: period.value.start, to: period.value.end }
)

const summary = computed(() =>
  presentSummary(accounting.journal.value, bounds.value.from, bounds.value.to)
)
const summaryCards = computed(() => summary.value.cards)
const banner = computed(() => summary.value.banner)

const LAST_ROW_SPAN: Record<number, string> = {
  1: 'lg:col-span-12',
  2: 'lg:col-span-6',
  3: 'lg:col-span-4',
  4: 'lg:col-span-3'
}

function cardSpan(index: number): string {
  if (index < 4) return 'lg:col-span-3'
  return LAST_ROW_SPAN[summaryCards.value.length - 4] ?? 'lg:col-span-3'
}

// Ledger size in the period — surfaced in the modal so the user knows a full ledger
// export may be long.
const ledgerEntryCount = computed(
  () => filterByPeriod(accounting.journal.value, bounds.value.from, bounds.value.to).length
)

// The sections picked in the modal go out as a PDF (one section per page) or an
// Excel workbook (one section per sheet), whichever button the user hits.
const { exportPdf, exportExcel } = useAccountingExport()

function onGenerate({ format, keys }: { format: ExportFormat; keys: SectionKey[] }): void {
  const { from, to } = bounds.value
  const specs = keys.map((key): SectionSpec => ({ key, from, to, asOf: to }))
  const report: SectionSpec = { key: 'summary', from, to }
  if (format === 'pdf') {
    exportPdf(
      specs,
      {
        filename: exportFilename(report, 'pdf'),
        pageBreak: true,
        ...(from ? { coverage: `Period ${periodLabel(from, to)}` } : {})
      },
      'Accounting report exported to PDF'
    )
  } else {
    exportExcel(specs, exportFilename(report, 'xlsx'), 'Accounting report exported to Excel')
  }
}
</script>
