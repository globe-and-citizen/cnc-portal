<template>
  <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
    <div class="border-default border-b px-6 py-4">
      <span class="text-base font-semibold">Conditions</span>
    </div>
    <div class="px-6 pt-2 pb-3.5">
      <div
        v-for="(cond, i) in conditions"
        :key="cond.label"
        class="flex items-center gap-3 py-3"
        :class="{ 'border-default/60 border-b': i < conditions.length - 1 }"
      >
        <span
          class="bg-primary/10 text-primary inline-flex items-center justify-center rounded-xl p-1.5"
        >
          <UIcon :name="cond.icon" class="size-4" />
        </span>
        <span class="text-muted flex-1 text-sm">{{ cond.label }}</span>
        <span class="text-sm font-bold">{{ cond.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount } from '@/utils'
import type { CreditRound } from '@/types'

const props = defineProps<{ round: CreditRound }>()

const conditions = computed(() => [
  {
    icon: 'heroicons:receipt-percent',
    label: 'Interest rate',
    value: `${props.round.rate}% fixed`
  },
  { icon: 'heroicons:clock', label: 'Term', value: `${props.round.period} days` },
  {
    icon: 'heroicons:calendar-days',
    label: 'Subscription deadline',
    value: props.round.deadline || '—'
  },
  { icon: 'heroicons:flag', label: 'Maturity', value: props.round.maturity || '—' },
  {
    icon: props.round.restricted ? 'heroicons:lock-closed' : 'heroicons:globe-alt',
    label: 'Access',
    value: props.round.restricted ? 'Restricted list' : 'Everyone'
  },
  {
    icon: 'heroicons:scale',
    label: 'Cap per lender',
    value: props.round.cap ? formatAmount(props.round.cap) : 'No cap'
  }
])
</script>
