<template>
  <section aria-labelledby="vesting-summary-heading" data-test="vesting-summary">
    <h2 id="vesting-summary-heading" class="sr-only">Vesting summary</h2>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="metric in metrics" :key="metric.label" class="overflow-hidden">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-muted text-sm">{{ metric.label }}</p>
            <USkeleton v-if="isLoading" class="mt-2 h-7 w-32" data-test="vesting-stat-skeleton" />
            <p v-else class="mt-2 truncate text-xl font-semibold" :data-test="metric.testId">
              {{ metric.value }}
            </p>
            <p class="text-muted mt-1 text-xs">{{ metric.description }}</p>
          </div>
          <div :class="metric.iconClass" class="rounded-xl p-2.5">
            <UIcon :name="metric.icon" class="size-5" />
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUnits } from 'viem'
import { VESTING_TOKEN_DECIMALS, type VestingTotals } from '@/types/vesting'
import { formatToken } from '@/utils/format'

interface Props {
  totals: VestingTotals
  tokenSymbol: string
  isLoading: boolean
}

const props = defineProps<Props>()

const amount = (value: bigint) =>
  formatToken(formatUnits(value, VESTING_TOKEN_DECIMALS), props.tokenSymbol, { maxDecimals: 2 })

const metrics = computed(() => [
  {
    label: 'Promised',
    value: amount(props.totals.promised),
    description: 'Total grants created',
    icon: 'i-lucide-scroll-text',
    iconClass: 'bg-primary/10 text-primary',
    testId: 'vesting-promised'
  },
  {
    label: 'Vested',
    value: amount(props.totals.vested),
    description: 'Earned across all schedules',
    icon: 'i-lucide-chart-no-axes-column-increasing',
    iconClass: 'bg-info/10 text-info',
    testId: 'vesting-vested'
  },
  {
    label: 'Claimable',
    value: amount(props.totals.claimable),
    description: 'Available to release now',
    icon: 'i-lucide-hand-coins',
    iconClass: 'bg-success/10 text-success',
    testId: 'vesting-claimable'
  },
  {
    label: 'Released',
    value: amount(props.totals.released),
    description: 'Shares already minted',
    icon: 'i-lucide-circle-check-big',
    iconClass: 'bg-neutral/10 text-muted',
    testId: 'vesting-released'
  }
])
</script>
