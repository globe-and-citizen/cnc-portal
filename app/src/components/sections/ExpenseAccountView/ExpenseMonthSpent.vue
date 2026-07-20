<template>
  <OverviewCard
    :title="totalMonthlySpentAmount"
    subtitle="Month Spent"
    variant="warning"
    :card-icon="cartIcon"
    :loading="loading"
  >
    <div v-if="spendingDelta" class="flex flex-row gap-1 text-black">
      <img
        :src="uptrendIcon"
        alt=""
        aria-hidden="true"
        :class="{ 'rotate-180': spendingDelta.direction === 'down' }"
      />
      <div>
        <span class="text-sm font-semibold" data-test="percentage-change">
          {{ spendingDelta.direction === 'up' ? '+' : '-' }} {{ spendingDelta.percent }}%
        </span>
        <span class="text-xs font-medium text-[#637381]">than last month</span>
      </div>
    </div>
  </OverviewCard>
</template>
<script setup lang="ts">
import cartIcon from '@/assets/cart.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { formatCurrencyShort, log } from '@/utils'
import { formatUnits, zeroAddress } from 'viem'
import { computed, watch } from 'vue'
import { SUPPORTED_TOKENS } from '@/constant'
import { useExpenseEventsViaLogs } from '@/composables/expense/useExpenseEventsViaLogs'

const teamStore = useTeamStore()
const toast = useToast()
const currencyStore = useCurrencyStore()
const contractAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))

const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000
const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime() / 1000
const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getTime() / 1000

// EXPERIMENT: derive monthly spend from the RPC-sourced Expense events instead
// of Ponder. Transfers out = native (tokenAddress = zeroAddress) + token.
const { result: expenseEvents, loading, error } = useExpenseEventsViaLogs(contractAddress)

const transfersInRange = (
  start: number,
  end: number
): { amount: bigint; tokenAddress: string }[] => {
  const events = expenseEvents.value
  if (!events) return []
  const inRange = (ts: number) => ts >= start && ts <= end
  return [
    ...events.expenseTransfers.items
      .filter((t) => inRange(t.timestamp))
      .map((t) => ({ amount: BigInt(t.amount), tokenAddress: zeroAddress as string })),
    ...events.expenseTokenTransfers.items
      .filter((t) => inRange(t.timestamp))
      .map((t) => ({ amount: BigInt(t.amount), tokenAddress: t.token }))
  ]
}

/** Sums `transfer` transactions, converted to the local currency. */
const sumInLocalCurrency = (transactions: { amount: bigint; tokenAddress: string }[]): number => {
  const spentByToken: Record<string, number> = {}
  for (const token of SUPPORTED_TOKENS) {
    spentByToken[token.id] = 0
  }
  transactions.forEach((transaction) => {
    const token = SUPPORTED_TOKENS.find(
      (t) => t.address.toLowerCase() === transaction.tokenAddress.toLowerCase()
    )
    if (token && spentByToken[token.id] !== undefined) {
      spentByToken[token.id]! += parseFloat(formatUnits(transaction.amount, token.decimals))
    }
  })

  let totalInLocal = 0
  for (const token of SUPPORTED_TOKENS) {
    const price =
      currencyStore.getTokenInfo(token.id)?.prices.find((p) => p.id === 'local')?.price || 0
    totalInLocal += (spentByToken[token.id] ?? 0) * price
  }
  return totalInLocal
}

const monthlySpentLocal = computed(() =>
  sumInLocalCurrency(transfersInRange(startOfMonth, endOfMonth))
)
const prevMonthlySpentLocal = computed(() =>
  sumInLocalCurrency(transfersInRange(startOfPrevMonth, endOfPrevMonth))
)

const totalMonthlySpentAmount = computed(() =>
  formatCurrencyShort(monthlySpentLocal.value, currencyStore.localCurrency.code)
)

const spendingDelta = computed<{ percent: string; direction: 'up' | 'down' } | null>(() => {
  const previous = prevMonthlySpentLocal.value
  // No baseline to compare against — hide the delta rather than show a fake one.
  if (previous <= 0) return null
  const change = ((monthlySpentLocal.value - previous) / previous) * 100
  return {
    percent: Math.abs(change).toFixed(1),
    direction: change >= 0 ? 'up' : 'down'
  }
})

watch(error, (err) => {
  if (err) {
    toast.add({ title: 'Failed to fetch monthly spent amount', color: 'error' })
    log.error('Failed to fetch monthly spent amount', err)
  }
})
</script>
