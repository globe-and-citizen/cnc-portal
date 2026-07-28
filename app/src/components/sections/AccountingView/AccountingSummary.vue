<template>
  <div class="flex flex-col gap-5">
    <!-- Report export: pick the sections, then generate PDF or Excel from the modal. -->
    <div class="flex items-center justify-end">
      <ExportReportModal :ledger-entry-count="ledgerEntryCount" @generate="onGenerate" />
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

    <!-- Metric cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="border-default bg-default rounded-2xl border p-4.5 shadow-sm"
        :class="card.accent ? [card.accentClass, 'border-t-[3px]'] : ''"
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
import { computed } from 'vue'
import ExportReportModal, { type ExportFormat } from './ExportReportModal.vue'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { presentSummaryCards, presentBanner } from '@/utils/accounting/presenter'
import { presentLedger } from '@/utils/accounting/ledgerPresenter'
import type { SectionKey, SectionSpec } from '@/utils/accounting/exportSpec'

const acc = useAccountingContext()

const summaryCards = computed(() =>
  presentSummaryCards(acc.summary.value, acc.incomeStatement.value, acc.balanceSheet.value)
)
const banner = computed(() => presentBanner(acc.balanceSheet.value, acc.generalLedger.value))

// Whole-book ledger size — surfaced in the modal so the user knows a full ledger
// export may be long.
const ledgerEntryCount = computed(() => presentLedger(acc.entries.value, 'All').entryCount)

// The Summary report exports the whole book (no per-page filters) for the
// sections picked in the modal — as a PDF (one section per page) or an Excel
// workbook (one section per sheet), whichever button the user hits.
const { exportPdf, exportExcel } = useAccountingExport()

function onGenerate({ format, keys }: { format: ExportFormat; keys: SectionKey[] }): void {
  const specs = keys.map((key): SectionSpec => ({ key }))
  if (format === 'pdf') {
    exportPdf(
      specs,
      { filename: 'cnc-accounting.pdf', pageBreak: true },
      'Accounting report exported to PDF'
    )
  } else {
    exportExcel(specs, 'cnc-accounting.xlsx', 'Accounting report exported to Excel')
  }
}
</script>
