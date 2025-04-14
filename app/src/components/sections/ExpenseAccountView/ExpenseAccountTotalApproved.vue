<template>
  <OverviewCard
    :title="totalApproved"
    subtitle="Total Approved"
    variant="info"
    :card-icon="personIcon"
    :loading="isLoadingNativeTokenPrice || isLoadingUsdcPrice"
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
import { useCryptoPrice } from '@/composables/useCryptoPrice'
import { USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { useCurrencyStore, useExpenseDataStore } from '@/stores'
import type { BudgetData, BudgetLimit } from '@/types'
import { formatCurrencyShort } from '@/utils'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const expenseDataStore = useExpenseDataStore()
const { price: usdcPrice, isLoading: isLoadingUsdcPrice } = useCryptoPrice('usd-coin')
const currencyStore = useCurrencyStore()
const {
  currency,
  isLoading: isLoadingNativeTokenPrice,
  nativeTokenPrice
} = storeToRefs(currencyStore)
const totalApproved = computed(() => {
  const { usdcAmount, usdtAmount, nativeTokenAmount } = calculateTokenAmounts()
  const total =
    (usdcAmount + usdtAmount) * (usdcPrice.value ?? 0) +
    nativeTokenAmount * (nativeTokenPrice.value ?? 0)

  return formatCurrencyShort(parseFloat(total.toString()), currency.value.code)
})

function calculateTokenAmounts() {
  return expenseDataStore.allExpenseDataParsed.reduce(
    (acc, limit: BudgetLimit) => {
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
