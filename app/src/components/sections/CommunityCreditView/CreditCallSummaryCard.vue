<template>
  <div class="border-default bg-default sticky top-3 rounded-2xl border p-6 shadow-sm">
    <div class="text-dimmed text-xs font-bold tracking-wider uppercase">Summary</div>
    <div class="mt-2 text-lg font-bold">{{ name }}</div>
    <div class="mt-3.5 flex items-baseline gap-2">
      <span class="text-[32px] font-extrabold tracking-tight">{{ formatNumber(target) }}</span>
      <span class="text-muted text-sm">{{ form.token }}</span>
    </div>

    <div class="mt-4.5 flex flex-col gap-2.5">
      <div v-for="row in rows" :key="row.label" class="flex items-center justify-between text-sm">
        <span class="text-muted">{{ row.label }}</span>
        <span class="font-semibold">{{ row.value }}</span>
      </div>
    </div>

    <div class="border-default mt-4 border-t border-dashed pt-4">
      <div class="flex items-baseline justify-between">
        <span class="text-muted text-sm">Repay at maturity</span>
        <span class="text-lg font-extrabold">{{ formatAmount(repay, form.token) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { creditTermLabel, formatAmount, formatNumber } from '@/utils'
import type { CreditCallForm } from '@/types'

const props = defineProps<{ form: CreditCallForm; whitelistCount: number }>()

const name = computed(() => props.form.name.trim() || 'Untitled round')
const target = computed(() => Number(props.form.target) || 0)
const rate = computed(() => Number(props.form.rate) || 0)
const repay = computed(() => target.value * (1 + rate.value / 100))

const accessLabel = computed(() =>
  props.form.access === 'everyone' ? 'Everyone' : `Restricted (${props.whitelistCount})`
)

/** 12-hour clock with AM/PM, e.g. `11:59 PM` — matches the native time input's own
 *  browser-rendered format (and the calendar's date style) rather than a raw 24-hour
 *  HH:mm, so the two don't visually disagree right next to each other. */
function formatTime12h(timeStr: string): string {
  const hour = Number(timeStr.split(':')[0])
  const minute = Number(timeStr.split(':')[1])
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeStr
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

const rows = computed(() => [
  { label: 'Interest', value: `${rate.value}% fixed` },
  { label: 'Term', value: creditTermLabel(props.form) },
  {
    label: 'Deadline',
    value: props.form.deadline
      ? `${props.form.deadline} ${formatTime12h(props.form.deadlineTime || '23:59')} UTC`
      : '—'
  },
  { label: 'Access', value: accessLabel.value },
  {
    label: 'Cap / lender',
    value: props.form.capOn ? formatAmount(Number(props.form.cap) || 0, props.form.token) : 'No cap'
  }
])
</script>
