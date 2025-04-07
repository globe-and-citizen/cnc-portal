<template>
  <div class="flex gap-10">
    <OverviewCard
      :title="totalBalance"
      variant="success"
      subtitle="Total Balance"
      :card-icon="bagIcon"
      :loading="isLoadingBalance"
    >
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 41.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
    <OverviewCard title="10.2K" subtitle="Month Claimed" variant="warning" :card-icon="cartIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 26.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
    <OverviewCard title="47.9K" subtitle="Pending Claim" variant="info" :card-icon="personIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
  </div>
</template>
<script setup lang="ts">
import bagIcon from '@/assets/bag.svg'
import cartIcon from '@/assets/cart.svg'
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { formatCurrencyShort } from '@/utils'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()
const { currency } = storeToRefs(currencyStore)
const { balances, isLoading: isLoadingBalance } = useContractBalance(
  teamStore.currentTeam?.teamContracts.find(
    (contract) => contract.type === 'CashRemunerationEIP712'
  )?.address
)
const totalBalance = computed(() => {
  return formatCurrencyShort(parseInt(balances.totalValueInLocalCurrency), currency.value.code)
})
</script>
