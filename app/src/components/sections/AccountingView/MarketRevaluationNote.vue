<script setup lang="ts">
import type { MarketRevaluationSummary } from '@/composables/accounting/useMarketRevaluation'
import { dayLabel, money } from '@/utils/accounting/presenter'

defineProps<{
  summary: MarketRevaluationSummary | null
  status: 'ready' | 'loading' | 'unavailable'
}>()
const signed = (value: bigint) => `${value > 0n ? '+' : ''}${money(value)}`
</script>

<template>
  <p v-if="status === 'loading'" class="text-muted text-sm" data-test="market-revaluation-note">
    Loading Safe market prices…
  </p>
  <p
    v-else-if="status === 'unavailable'"
    class="text-warning text-sm"
    data-test="market-revaluation-note"
  >
    The Safe's market value is unavailable for this date, so the Safe is shown at cost.
  </p>
  <p
    v-else-if="summary && summary.adjustment !== 0n"
    class="text-muted text-sm"
    data-test="market-revaluation-note"
  >
    Safe shown at market value: {{ money(summary.market) }} (cost {{ money(summary.cost) }},
    unrealized {{ signed(summary.adjustment) }}), using
    {{
      summary.source === 'gateway'
        ? 'the same prices as Safe Account'
        : `CoinGecko daily prices at the end of ${dayLabel(new Date(summary.at * 1000))}`
    }}.
  </p>
</template>
