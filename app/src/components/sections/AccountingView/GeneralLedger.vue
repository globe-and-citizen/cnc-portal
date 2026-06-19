<template>
  <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
    <div class="border-default flex flex-col gap-3 border-b px-5 py-4">
      <!-- Title + category filter -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span class="bg-muted text-muted flex size-7 items-center justify-center rounded-lg">
            <UIcon name="i-heroicons-book-open" class="size-4.5" />
          </span>
          <span class="text-[15px] font-semibold">General ledger</span>
          <UBadge color="primary" variant="subtle" :label="`${ledger.entryCount} entries`" />
        </div>
        <SegmentedPills
          :items="categoryItems"
          :model-value="filter"
          @update:model-value="filter = $event"
        />
      </div>

      <!-- Reporting period — shared AccountingDatePicker (range mode) -->
      <div class="flex flex-wrap items-center gap-2.5">
        <AccountingDatePicker
          v-model="period"
          mode="range"
          storage-key="cnc-accounting-ledger-period"
        />
      </div>
    </div>

    <LedgerTable :rows="ledger.rows" :total="ledger.total" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import SegmentedPills, { type PillItem } from './SegmentedPills.vue'
import LedgerTable from './LedgerTable.vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import { defaultValueForMode, type Range } from '@/utils/datePicker'
import { buildLedger, ledgerCategories } from '@/utils/accountingDemo'

const filter = ref('All')
// Reporting period (range mode) — defaults to "All time" (whole book).
const period = ref<Range>(defaultValueForMode('range') as Range)

const categoryItems: PillItem[] = ledgerCategories.map((c) => ({ value: c, label: c }))

// The demo journal is keyed by ISO `YYYY-MM-DD`; map the picker's Date range onto that shape.
const fromIso = computed(() => dayjs(period.value.start).format('YYYY-MM-DD'))
const toIso = computed(() => dayjs(period.value.end).format('YYYY-MM-DD'))

const ledger = computed(() => buildLedger(filter.value, fromIso.value, toIso.value))
</script>
