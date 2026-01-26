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
import { formatUnits } from 'viem'
import { watch } from 'vue'
import { computed } from 'vue'
import { SUPPORTED_TOKENS } from '@/constant'

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()
const contractAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))

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
  // Map: tokenId -> total amount spent for that token
  const spentByToken: Record<string, number> = {}
  for (const token of SUPPORTED_TOKENS) {
    spentByToken[token.id] = 0
  }
  transactions.forEach((transaction: { amount: bigint; tokenAddress: string }) => {
    const token = SUPPORTED_TOKENS.find(
      (t) => t.address.toLowerCase() === transaction.tokenAddress.toLowerCase()
    )
    if (token) {
      const decimals = token.decimals
      if (spentByToken[token.id] !== undefined) {
        spentByToken[token.id]! += parseFloat(formatUnits(transaction.amount, decimals))
      }
    }
  })

  let totalInLocal = 0
  for (const token of SUPPORTED_TOKENS) {
    const price =
      currencyStore.getTokenInfo(token.id)?.prices.find((p) => p.id === 'local')?.price || 0
    const spent = spentByToken[token.id]
    if (spent !== undefined) {
      totalInLocal += spent * price
    }
  }
  return formatCurrencyShort(totalInLocal, currencyStore.localCurrency.code)
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly spent amount')
    log.error('Failed to fetch monthly spent amount', err)
  }
})
</script>
