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
import { formatEther } from 'viem'
import { watch, computed } from 'vue'
import { useStorage } from '@vueuse/core'

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()
const contractAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type === 'CashRemunerationEIP712'
)?.address

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

// const contractAddress = '0xFF9544a21EAA0C9B54D3d9134A62057076137fF4'
const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime() / 1000
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000
const { result, loading, error } = useQuery(
  gql`
    query GetCashRemunerationMonthlyTransactions(
      $contractAddress: Bytes!
      $startDate: BigInt!
      $endDate: BigInt!
    ) {
      transactions(
        where: {
          contractAddress: $contractAddress
          blockTimestamp_gte: $startDate
          blockTimestamp_lte: $endDate
          transactionType: withdraw
        }
      ) {
        amount
      }
    }
  `,
  { contractAddress, startDate: startOfMonth, endDate: endOfMonth }
)

const totalMonthlyWithdrawnAmount = computed(() => {
  const transactions = result.value?.transactions || []
  const totalAmount = transactions.reduce((acc: number, transaction: { amount: number }) => {
    return acc + parseFloat(formatEther(BigInt(transaction.amount)))
  }, 0)

  const nativeTokenInfo = currencyStore.getTokenInfo('native')
  return formatCurrencyShort(
    totalAmount * (nativeTokenInfo?.prices.find((p) => p.id == 'local')?.price || 0),
    currency.value?.code
  )
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly withdrawn amount')
    log.error('Failed to fetch monthly withdrawn amount', err)
  }
})
</script>
