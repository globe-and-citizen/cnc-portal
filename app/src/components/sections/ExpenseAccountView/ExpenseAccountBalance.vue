<template>
  <OverviewCard
    data-test="expense-account-balance"
    :title="totalBalance"
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
</template>
<script setup lang="ts">
import bagIcon from '@/assets/bag.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useContractBalance } from '@/composables'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { formatCurrencyShort } from '@/utils'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const teamStore = useTeamStore()
const expenseAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type === 'ExpenseAccountEIP712'
)?.address
const { balances } = useContractBalance(expenseAddress)
const currencyStore = useCurrencyStore()
const { currency } = storeToRefs(currencyStore)
const totalBalance = computed(() => {
  return formatCurrencyShort(parseFloat(balances.totalValueInLocalCurrency), currency.value.code)
})
</script>
