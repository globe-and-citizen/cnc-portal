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
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import OverviewCard from '@/components/OverviewCard.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import bagIcon from '@/assets/bag.svg'
import { useSafeDeployment } from '@/composables/trading'
import { formatUnits } from 'viem'
import { useSafeBalances } from '@/queries/polymarket.queries'
import { useTraderSafesStore } from '@/stores'

const currencyStore = useCurrencyStore()
const traderSafesStore = useTraderSafesStore()
// const { derivedSafeAddressFromEoa } = useSafeDeployment()
const isLoading = computed(() => false)
const derivedSafeAddressFromEoa = computed(() => traderSafesStore.selectedSafe?.address ?? null)

const { data: balances } = useSafeBalances(derivedSafeAddressFromEoa)

// Format balance
const formattedBalance = computed(() => {
  if (balances.value?.length && balances.value?.length > 0) {
    const balance = balances.value.find((b) => b.token?.symbol === 'USDC.E')
    const amount = balance
      ? Number(formatUnits(BigInt(balance.balance), balance.token?.decimals ?? 6))
      : 0
    return `${currencyStore.localCurrency.symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2
    })}`
  } else
    return `${currencyStore.localCurrency.symbol}${(0).toLocaleString('en-US', {
      minimumFractionDigits: 2
    })}`
})

watch(
  balances,
  (newBalances) => {
    if (newBalances) console.log('fetchedBalances: ', newBalances)
  },
  { immediate: true }
)
</script>
