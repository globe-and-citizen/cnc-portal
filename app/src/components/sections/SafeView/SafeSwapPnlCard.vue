<template>
  <div v-if="report?.count" class="mt-5" data-test="safe-swap-pnl">
    <p class="text-xs font-medium text-gray-500">
      {{ report.count === 1 ? '1 swap' : `${report.count} swaps` }}
    </p>
    <dl class="mt-2 flex flex-wrap gap-3">
      <div
        class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
        title="Value of the assets given up, at the USD price of each swap's day."
        data-test="safe-swap-swapped"
      >
        <dt class="text-xs text-gray-500">Swapped value</dt>
        <dd class="mt-1 font-semibold">{{ formatUsd(report.swappedUsd) }}</dd>
      </div>
      <div
        class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
        title="What the assets received are worth today."
        data-test="safe-swap-current"
      >
        <dt class="text-xs text-gray-500">Current value swap</dt>
        <dd class="mt-1 font-semibold">{{ formatUsd(report.currentUsd) }}</dd>
      </div>
      <div
        class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
        :title="feesHint"
        data-test="safe-swap-fees"
      >
        <dt class="text-xs text-gray-500">Fees</dt>
        <dd class="mt-1 font-semibold">{{ formatUsd(report.feesUsd) }}</dd>
      </div>
      <div
        class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
        data-test="safe-swap-pnl-value"
      >
        <dt class="text-xs text-gray-500">P&L</dt>
        <dd class="mt-1 font-semibold" :class="TREND_CLASS[trend]" :data-trend="trend">
          {{ formatUsd(report.pnlUsd) }}
          <span v-if="report.pnlRatio !== null" class="text-xs font-medium">
            ({{ formatPercent(report.pnlRatio, { signed: true }) }})
          </span>
        </dd>
      </div>
    </dl>
    <p
      v-if="report.missingPrices.length"
      class="text-warning mt-2 text-xs"
      data-test="safe-swap-missing-prices"
    >
      Incomplete: no USD price for {{ report.missingPrices.join(', ') }}.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSafeSwapPnl } from '@/composables/safe/useSafeSwapPnl'
import { formatPercent, formatUsd } from '@/utils/format'

const props = defineProps<{ address: string }>()

const { data: report } = useSafeSwapPnl(() => props.address)

type Trend = 'gain' | 'loss' | 'flat'
const TREND_CLASS: Record<Trend, string> = { gain: 'text-success', loss: 'text-error', flat: '' }

/** A P&L that rounds to zero cents is neither a gain nor a loss. */
const trend = computed<Trend>(() => {
  const value = report.value?.pnlUsd ?? 0
  return Math.abs(value) < 0.005 ? 'flat' : value > 0 ? 'gain' : 'loss'
})

const feesHint = computed(() => {
  if (!report.value) return undefined
  const { feesReported, count } = report.value
  if (!feesReported) return 'No fee reported by the swap provider.'
  return feesReported < count
    ? `Fees reported by CoW Protocol for ${feesReported} of ${count} swaps.`
    : 'Fees reported by CoW Protocol, included in the swapped value.'
})
</script>
