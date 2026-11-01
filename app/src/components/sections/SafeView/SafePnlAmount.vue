<template>
  <span :class="TREND_CLASS[trend]" :data-trend="trend" data-test="safe-pnl-amount">
    {{ formatUsd(value) }}
    <span v-if="ratio !== undefined && ratio !== null" class="text-xs font-medium">
      ({{ formatPercent(ratio, { signed: true }) }})
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent, formatUsd } from '@/utils/format'

const props = defineProps<{ value: number | null; ratio?: number | null }>()

type Trend = 'gain' | 'loss' | 'flat'
const TREND_CLASS: Record<Trend, string> = { gain: 'text-success', loss: 'text-error', flat: '' }

/** A P&L that is unknown or rounds to zero cents is neither a gain nor a loss. */
const trend = computed<Trend>(() => {
  const { value } = props
  return value === null || Math.abs(value) < 0.005 ? 'flat' : value > 0 ? 'gain' : 'loss'
})
</script>
