<template>
  <div class="flex gap-6">
    <TradingAccountBalance />
    <TradingTotalPnl />
    <TradingPerformance />
  </div>

  <div class="flex sm:flex-row justify-end sm:items-start mt-6">
    <div class="flex flex-wrap gap-2 sm:gap-4" data-test="safe-address">
      <span class="text-sm">Safe Wallet Address</span>
      <AddressToolTip :address="safeAddress ?? ''" class="text-xs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TradingAccountBalance from './TradingAccountBalance.vue'
import TradingTotalPnl from './TradingTotalPnL.vue'
import TradingPerformance from './TradingPerformance.vue'
import { useSafeDeployment } from '@/composables/trading'

// Composables
const { derivedSafeAddressFromEoa } = useSafeDeployment()

// Safe address
const safeAddress = computed(() => derivedSafeAddressFromEoa.value)
</script>
