<template>
  <div class="flex flex-col gap-5">
    <!-- Balance-check banner -->
    <div
      class="bg-success/10 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
      data-test="balance-banner"
    >
      <UIcon name="i-heroicons-check-badge" class="text-success size-5 shrink-0" />
      <div class="min-w-0 flex-1 text-sm">
        <span class="text-success font-semibold">Books are balanced</span>
        <span class="text-success/90"> — Assets = Liabilities + Equity · </span>
        <span class="text-success font-bold tabular-nums">$142.20 = $0.00 + $142.20</span>
      </div>
      <span class="text-success/80 text-xs tabular-nums"
        >Trial balance Dr $253.00 = Cr $253.00</span
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
import { summaryCards } from '@/utils/accountingDemo'
</script>
