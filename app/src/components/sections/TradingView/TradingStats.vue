<template>
  <div class="flex gap-6">
    <TradingAccountBalance />
    <TradingTotalPnl />
    <TradingPerformance />
  </div>

  <div class="flex sm:flex-row justify-end sm:items-start mt-6">
    <div class="flex flex-wrap gap-2 sm:gap-4" data-test="safe-address">
      <span class="text-sm">Safe Wallet Address</span>
      <AddressToolTip :address="selectedSafe?.address ?? ''" class="text-xs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import TradingAccountBalance from './TradingAccountBalance.vue'
import TradingTotalPnl from './TradingTotalPnL.vue'
import TradingPerformance from './TradingPerformance.vue'
import { useTeamSafes } from '@/composables/safe'

const { selectedSafe } = useTeamSafes()
</script>
