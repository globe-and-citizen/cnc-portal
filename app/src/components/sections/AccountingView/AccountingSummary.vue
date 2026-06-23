<template>
  <div class="flex flex-col gap-5">
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
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="border-default bg-default rounded-2xl border p-4.5 shadow-sm"
        :class="{ 'border-t-primary border-t-[3px]': card.accent }"
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
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { presentSummaryCards, presentBanner } from '@/utils/accounting/presenter'

const acc = useAccountingContext()

const summaryCards = computed(() =>
  presentSummaryCards(acc.summary.value, acc.incomeStatement.value, acc.balanceSheet.value)
)
const banner = computed(() => presentBanner(acc.balanceSheet.value, acc.generalLedger.value))
</script>
