<template>
  <OverviewCard
    :title="totalApproved"
    subtitle="Total Approved"
    variant="info"
    :card-icon="personIcon"
    :loading="nativeToken.isLoading || usdc.isLoading"
    ><div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
        <span class="font-medium text-[#637381] text-xs">than last week</span>
      </div>
    </div></OverviewCard
  >
</template>
<script setup lang="ts">
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { useCurrencyStore, useExpenseDataStore } from '@/stores'
import type { BudgetData } from '@/types'
import { formatCurrencyShort } from '@/utils'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const expenseDataStore = useExpenseDataStore()
const currencyStore = useCurrencyStore()
const { localCurrency, nativeToken, usdc } = storeToRefs(currencyStore)
const totalApproved = computed(() => {
  const { usdcAmount, usdtAmount, nativeTokenAmount } = calculateTokenAmounts()
  const total =
    (usdcAmount + usdtAmount) * (usdc.value.priceInLocal ?? 0) +
    nativeTokenAmount * (nativeToken.value.priceInLocal ?? 0)

  return formatCurrencyShort(parseFloat(total.toString()), localCurrency.value.code)
})

function calculateTokenAmounts() {
  return expenseDataStore.allExpenseDataParsed.reduce(
    (acc, limit) => {
      if (limit.status !== 'enabled') {
        return acc
      }
      const approvedAmount = calculateMinApprovedAmount(limit.budgetData)
      if (limit.tokenAddress === USDC_ADDRESS) {
        acc.usdcAmount += approvedAmount
      } else if (limit.tokenAddress === USDT_ADDRESS) {
        acc.usdtAmount += approvedAmount
      } else {
        acc.nativeTokenAmount += approvedAmount
      }
      return acc
    },
    { usdcAmount: 0, usdtAmount: 0, nativeTokenAmount: 0 }
  )
}

function calculateMinApprovedAmount(budgets: BudgetData[]): number {
  const transactionPerPeriod = budgets.find((budget) => budget.budgetType === 0)?.value
  const amountPerPeriod = budgets.find((budget) => budget.budgetType === 1)?.value
  const amountPerTransaction = budgets.find((budget) => budget.budgetType === 2)?.value

  if (transactionPerPeriod && amountPerPeriod && amountPerTransaction) {
    return Math.min(amountPerPeriod, transactionPerPeriod * amountPerTransaction)
  }

  if (transactionPerPeriod && amountPerTransaction) {
    return transactionPerPeriod * amountPerTransaction
  }

  if (amountPerPeriod && amountPerTransaction) {
    return Math.min(amountPerPeriod, amountPerTransaction)
  }

  return 0
}

onMounted(async () => {
  await expenseDataStore.fetchAllExpenseData()
})
</script>
