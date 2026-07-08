<template>
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
      <div
        v-for="a in balance.assetLines"
        :key="a.label"
        class="border-default/60 flex items-center justify-between border-b py-2"
      >
        <span class="text-sm">{{ a.label }}</span>
        <span class="text-sm font-semibold tabular-nums">{{ a.value }}</span>
      </div>
      <div class="flex items-center justify-between py-2.5">
        <span class="text-sm font-bold">Total assets</span>
        <span class="text-sm font-bold tabular-nums">{{ balance.totalAssets }}</span>
      </div>

      <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">
        Liabilities
      </p>
      <div
        v-for="l in balance.liabLines"
        :key="l.label"
        class="border-default/60 flex items-center justify-between border-b py-2"
      >
        <span class="text-muted text-sm">{{ l.label }}</span>
        <span class="text-muted text-sm font-semibold tabular-nums">{{ l.value }}</span>
      </div>

      <p class="text-dimmed pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase">Equity</p>
      <div
        v-for="q in balance.equityLines"
        :key="q.label"
        class="border-default/60 flex items-center justify-between border-b py-2"
      >
        <span class="text-sm">{{ q.label }}</span>
        <span class="text-sm font-semibold tabular-nums">{{ q.value }}</span>
      </div>
      <div class="flex items-center justify-between py-2.5">
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import { defaultValueForMode } from '@/utils/datePicker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { presentBalance } from '@/utils/accounting/presenter'

// Point-in-time "as of" date (date mode) — defaults to end of today.
const asOf = ref<Date>(defaultValueForMode('date') as Date)

const acc = useAccountingContext()
const balance = computed(() => presentBalance(acc.entries.value, asOf.value))
</script>
