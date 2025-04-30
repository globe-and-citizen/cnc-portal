<template>
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
</template>
<script lang="ts" setup>
import bagIcon from '@/assets/bag.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { formatCurrencyShort } from '@/utils'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()
const { localCurrency } = storeToRefs(currencyStore)
const contractAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type === 'CashRemunerationEIP712'
)?.address
const { balances, isLoading: isLoadingBalance } = useContractBalance(contractAddress)
const totalBalance = computed(() => {
  return formatCurrencyShort(
    parseFloat(balances.totalValueInLocalCurrency),
    localCurrency.value.code
  )
})
</script>
