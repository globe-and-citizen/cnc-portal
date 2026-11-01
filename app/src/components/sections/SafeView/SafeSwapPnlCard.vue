<template>
  <div v-if="report?.count" class="mt-5" data-test="safe-swap-pnl">
    <p class="text-xs font-medium text-gray-500">
      {{ report.count === 1 ? '1 swap' : `${report.count} swaps` }}
    </p>
    <dl class="mt-2 flex flex-wrap gap-3">
      <div
        class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
        data-test="safe-swap-pnl-value"
      >
        <dt class="text-xs text-gray-500">P&L</dt>
        <dd class="mt-1 font-semibold">
          <SafePnlAmount :value="report.pnlUsd" :ratio="report.pnlRatio" />
        </dd>
      </div>
      <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60" data-test="safe-swap-fees">
        <dt class="text-xs text-gray-500">Transaction fees</dt>
        <dd class="mt-1 font-semibold">{{ formatUsd(report.feesUsd) }}</dd>
      </div>
    </dl>
    <p
      v-if="report.unvaluedTokens.length"
      class="text-warning mt-2 text-xs"
      data-test="safe-swap-unvalued"
    >
      Incomplete: {{ report.unvaluedTokens.join(', ') }} could not be valued.
    </p>
  </div>
</template>

<script setup lang="ts">
import SafePnlAmount from './SafePnlAmount.vue'
import { useSafeSwapPnl } from '@/composables/safe/useSafeSwapPnl'
import { formatUsd } from '@/utils/format'

const props = defineProps<{ address: string }>()

const { costBasis: report } = useSafeSwapPnl(() => props.address)
</script>
