<template>
  <OverviewCard
    :title="totalMonthlyWithdrawnAmount"
    subtitle="Month Claimed"
    variant="warning"
    :card-icon="cartIcon"
    :loading="loading"
  >
    <div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="font-semibold text-sm" data-test="percentage-increase">+ 26.3% </span>
        <span class="font-medium text-[#637381] text-xs">than last week</span>
      </div>
    </div>
  </OverviewCard>
</template>
<script setup lang="ts">
import cartIcon from '@/assets/cart.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useCurrencyStore, useTeamStore, useToastStore } from '@/stores'
import { formatCurrencyShort, log } from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { storeToRefs } from 'pinia'
import { formatEther } from 'viem'
import { watch } from 'vue'
import { computed } from 'vue'

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()
const { currency, nativeTokenPrice } = storeToRefs(currencyStore)
const contractAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type === 'CashRemunerationEIP712'
)?.address

const year = new Date().getUTCFullYear().toString()
const month = (new Date().getUTCMonth() + 1).toString().padStart(2, '0')
const { result, error, loading } = useQuery(
  gql`
    query GetMonthlyWithdrawn($contractAddress: Bytes!, $date: String!) {
      monthlyWithdrawn(
        id: $date
        contractAddress: $contractAddress
        type: "CashRemunerationEIP712"
      ) {
        id
        totalAmount
        contractType
        contractAddress
      }
    }
  `,
  {
    contractAddress,
    date: `${year}-${month}`
  }
)
const totalMonthlyWithdrawnAmount = computed(() => {
  return result.value?.monthlyWithdrawn
    ? formatCurrencyShort(
        Number(formatEther(result.value.monthlyWithdrawn.totalAmount)) *
          (nativeTokenPrice.value || 0),
        currency.value.code
      )
    : '0'
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly withdrawn amount')
    log.error('Failed to fetch monthly withdrawn amount', err)
  }
})
</script>
