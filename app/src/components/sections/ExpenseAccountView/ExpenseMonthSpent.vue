<template>
  <OverviewCard
    :title="totalMonthlySpentAmount"
    subtitle="Month Spent"
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
import { formatEther, formatUnits, zeroAddress } from 'viem'
import { watch } from 'vue'
import { computed } from 'vue'

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()
const { currency, nativeTokenPrice, usdPriceInLocal } = storeToRefs(currencyStore)
const contractAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type === 'ExpenseAccountEIP712'
)?.address

const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000
const { result, loading, error } = useQuery(
  gql`
    query GetExpenseTransactions($contractAddress: Bytes!, $startDate: BigInt!, $endDate: BigInt!) {
      transactions(
        where: {
          contractAddress: $contractAddress
          blockTimestamp_gte: $startDate
          blockTimestamp_lte: $endDate
          transactionType: transfer
        }
      ) {
        amount
        tokenAddress
      }
    }
  `,
  { contractAddress, startDate: startOfMonth, endDate: endOfMonth }
)

const totalMonthlySpentAmount = computed(() => {
  const transactions = result.value?.transactions || []
  let totalAmountInNetworkCurrency = 0
  let totalAmountInUSDC = 0
  transactions.forEach((transaction: { amount: bigint; tokenAddress: string }) => {
    if (transaction.tokenAddress === zeroAddress) {
      totalAmountInNetworkCurrency += parseFloat(formatEther(transaction.amount))
    } else {
      totalAmountInUSDC += parseFloat(formatUnits(transaction.amount, 6))
    }
  })
  const totalNetworkInLocalCurrency = totalAmountInNetworkCurrency * (nativeTokenPrice.value || 0)
  const totalUSDCInLocalCurrency = totalAmountInUSDC * (usdPriceInLocal.value || 0)

  return formatCurrencyShort(
    totalNetworkInLocalCurrency + totalUSDCInLocalCurrency,
    currency.value.code
  )
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly spent amount')
    log.error('Failed to fetch monthly spent amount', err)
  }
})
</script>
