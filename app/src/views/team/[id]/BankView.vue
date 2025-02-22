<template>
  <div class="flex flex-col gap-6">
    <BankBalanceSection
      v-if="teamStore.currentTeam"
      ref="bankBalanceSection"
      :bank-address="typedBankAddress"
      :price-data="priceData"
      @balance-updated="$forceUpdate()"
    />

    <TokenHoldingsSection
      v-if="bankBalanceSection"
      :bank-balance-section="bankBalanceSection"
      :price-data="priceData"
    />
    <TransactionsHistorySection />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { type Address } from 'viem'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import TokenHoldingsSection from '@/components/sections/BankView/TokenHoldingsSection.vue'
import TransactionsHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'
import { useTeamStore } from '@/stores'
import { useCryptoPrice } from '@/composables/useCryptoPrice'

const teamStore = useTeamStore()
const typedBankAddress = computed(() => teamStore.currentTeam?.bankAddress as Address | undefined)
const bankBalanceSection = ref<InstanceType<typeof BankBalanceSection> | null>(null)

// Map network currency symbol to CoinGecko ID - always use ethereum price for testnets
const networkCurrencyId = computed(() => {
  // Always use ethereum price for testnets
  return 'ethereum'
})

const {
  prices,
  loading: pricesLoading,
  error: pricesError
} = useCryptoPrice([networkCurrencyId.value, 'usd-coin'])

// Computed properties for prices
const networkCurrencyPrice = computed(() => prices.value[networkCurrencyId.value]?.usd || 0)

const usdcPrice = computed(
  () => prices.value['usd-coin']?.usd || 1 // Default to 1 since USDC is a stablecoin
)

// Pass down price data to child components
const priceData = computed(() => ({
  networkCurrencyPrice: networkCurrencyPrice.value,
  usdcPrice: usdcPrice.value,
  loading: pricesLoading.value,
  error: pricesError.value ? true : null
}))
</script>
