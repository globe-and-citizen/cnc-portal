<template>
  <OverviewCard
    data-test="trading-performance"
    :title="formattedPerformance"
    subtitle="Performance"
    :variant="pnlPercentage >= 0 ? 'success' : 'error'"
    :card-icon="personIcon"
    :loading="isLoading"
  >
    <div class="flex flex-row gap-1">
      <!-- Icon in white circle -->
      <div class="flex items-center justify-center w-6 h-6 bg-white rounded-full">
        <icon
          :icon="
            pnlPercentage >= 0 ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'
          "
          :class="`w-4 h-4 ${pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`"
        />
      </div>

      <div>
        <span
          :class="`font-semibold text-sm ${pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`"
          data-test="performance-trend"
        >
          {{ winningTradesCount }}/{{ totalTradesCount }}
        </span>
        <span class="font-medium text-gray-500 text-xs"> winning trades</span>
      </div>
    </div>
  </OverviewCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import OverviewCard from '@/components/OverviewCard.vue'
import personIcon from '@/assets/person.svg'
import { useUserPositions, useSafeDeployment } from '@/composables/trading'
import { useTraderSafesStore } from '@/stores'

// const { derivedSafeAddressFromEoa } = useSafeDeployment()
const traderSafesStore = useTraderSafesStore()
const derivedSafeAddressFromEoa = computed(() => traderSafesStore.selectedSafe?.address)
const { pnlStats } = useUserPositions(derivedSafeAddressFromEoa.value ?? undefined)

const isLoading = computed(() => false)
const pnlPercentage = computed(() => pnlStats?.value?.winningPercentage ?? 0)
const winningTradesCount = computed(() => pnlStats.value?.winningTrades ?? 0)
const totalTradesCount = computed(() => pnlStats.value?.totalTrades)
// Format performance
const formattedPerformance = computed(() => {
  const sign = pnlPercentage.value >= 0 ? '+' : ''
  return `${sign}${pnlPercentage.value.toFixed(1)}%`
})
</script>
