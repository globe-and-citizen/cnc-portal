<template>
  <OverviewCard
    data-test="trading-account-balance"
    :title="formattedBalance"
    subtitle="Account Balance"
    variant="success"
    :card-icon="bagIcon"
    :loading="isLoading"
  >
    <div class="flex flex-row gap-1">
      <div class="flex items-center justify-center w-6 h-6 bg-white rounded-full">
        <icon icon="heroicons:arrow-trending-up" class="w-4 h-4 text-green-500" />
      </div>
      <div>
        <span class="font-semibold text-sm text-green-500" data-test="balance-trend">+ 5.2% </span>
        <span class="font-medium text-gray-500 text-xs">since last week</span>
      </div>
    </div>
  </OverviewCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import OverviewCard from '@/components/OverviewCard.vue'
// import { useWallet } from '@/composables/useWallet'
import { useCurrencyStore } from '@/stores/currencyStore'
import bagIcon from '@/assets/bag.svg'

// const wallet = useWallet()
const currencyStore = useCurrencyStore()

// Mock data - replace with real data
const accountBalance = computed(() => 12450.75)
const isLoading = computed(() => false)

// Format balance
const formattedBalance = computed(() => {
  return `${currencyStore.localCurrency.symbol}${accountBalance.value.toLocaleString('en-US', {
    minimumFractionDigits: 2
  })}`
})
</script>
