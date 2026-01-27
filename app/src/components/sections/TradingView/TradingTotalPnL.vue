<template>
  <OverviewCard
    data-test="trading-total-pnl"
    :title="formattedTotalPnl"
    :subtitle="pnlLabel"
    :variant="totalPnl >= 0 ? 'success' : 'error'"
    :card-icon="cartIcon"
    :loading="isLoading"
  >
    <div class="flex flex-row gap-1">
      <div class="flex items-center justify-center w-6 h-6 bg-white rounded-full">
        <icon
          :icon="totalPnl >= 0 ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'"
          :class="`w-4 h-4 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`"
        />
      </div>
      <div>
        <span
          :class="`font-semibold text-sm ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`"
          data-test="pnl-trend"
        >
          {{ totalPnl >= 0 ? '+' : '' }}{{ pnlPercentage.toFixed(1) }}%
        </span>
        <span class="font-medium text-gray-500 text-xs">total return</span>
      </div>
    </div>
  </OverviewCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import OverviewCard from '@/components/OverviewCard.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import cartIcon from '@/assets/cart.svg'
import { useUserPositions } from '@/composables/trading'
import { useTeamSafes } from '@/composables/safe'

const currencyStore = useCurrencyStore()
const { selectedSafe } = useTeamSafes()
const derivedSafeAddressFromEoa = computed(() => selectedSafe.value?.address)
const { pnlStats } = useUserPositions(derivedSafeAddressFromEoa)
const isLoading = computed(() => false)

// Calculate P&L from trades
const totalPnl = computed(() => pnlStats.value?.totalPnl ?? 0)

const pnlPercentage = computed(() => pnlStats.value?.totalPnlPercentage ?? 0)

// Format P&L
const formattedTotalPnl = computed(() => {
  const sign = totalPnl.value >= 0 ? '+' : ''
  return `${sign}${currencyStore.localCurrency.symbol}${Math.abs(totalPnl.value).toFixed(2)}`
})

const pnlLabel = computed(() => (totalPnl.value >= 0 ? 'Total Profit' : 'Total Loss'))
</script>
