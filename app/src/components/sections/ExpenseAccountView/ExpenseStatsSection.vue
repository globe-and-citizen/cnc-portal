<template>
  <div class="flex gap-6">
    <OverviewCard
      data-test="expense-account-balance"
      :title="`${formattedNetworkCurrencyBalance} ${NETWORK.currencySymbol}`"
      subtitle="Total Balance"
      variant="success"
      :card-icon="bagIcon"
    >
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 41.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
    <OverviewCard title="10.2K" subtitle="Month Spent" variant="warning" :card-icon="cartIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 26.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
    <OverviewCard title="47.9K" subtitle="Total Approved" variant="info" :card-icon="personIcon"
      ><div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div></OverviewCard
    >
  </div>

  <div class="flex sm:flex-row justify-end sm:items-start gap-4 mb-10">
    <div class="flex flex-wrap gap-2 sm:gap-4" data-test="expense-account-address">
      <span class="text-sm">Expense Account Address </span>
      <AddressToolTip
        :address="teamStore.currentTeam?.expenseAccountEip712Address ?? ''"
        class="text-xs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { NETWORK } from '@/constant'
import { useTeamStore } from '@/stores'
import { useBalance, useChainId } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import { log, parseError } from '@/utils'
import OverviewCard from '@/components/OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'
import cartIcon from '@/assets/cart.svg'
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'

//#region  Composables
const teamStore = useTeamStore()
const chainId = useChainId()

const {
  data: networkCurrencyBalance,
  // isLoading: isLoadingNetworkCurrencyBalance,
  error: networkCurrencyBalanceError,
  refetch: refetchNetworkCurrencyBalance
} = useBalance({
  address: teamStore.currentTeam?.expenseAccountEip712Address as unknown as Address,
  chainId
})
//#endregion

//Computed Values
const formattedNetworkCurrencyBalance = computed(() =>
  networkCurrencyBalance.value ? formatEther(networkCurrencyBalance.value.value) : '0'
)

//#region Watch
watch(networkCurrencyBalanceError, (newError) => {
  if (newError) {
    log.error('networkCurrencyBalanceError.value: ', parseError(newError))
  }
})
//#endregion

onMounted(async () => {
  await refetchNetworkCurrencyBalance()
})
</script>
