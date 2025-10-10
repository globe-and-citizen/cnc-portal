<template>
  <CardComponent :title="title" class="w-full">
    <template #card-action>
      <InvestorsTransactionFilters
        :unique-types="uniqueTypes"
        :show-date-filter="showDateFilter"
        :data-test-prefix="dataTestPrefix"
        v-model:date-range="dateRange"
        v-model:selected-type="selectedType"
      />
    </template>
    <InvestorsTransactionTable :transactions="displayedTransactions" />
  </CardComponent>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

import CardComponent from '@/components/CardComponent.vue'

import type { InvestorsTransaction } from '@/types/transactions'
import { onClickOutside } from '@vueuse/core'

import InvestorsTransactionFilters from '@/components/sections/SherTokenView/InvestorsTransactionFilter.vue'
import InvestorsTransactionTable from '@/components/sections/SherTokenView/InvestorsTransactionTable.vue'
const props = withDefaults(
  defineProps<{
    transactions: InvestorsTransaction[]
    title: string
    showDateFilter?: boolean
    dataTestPrefix?: string
  }>(),
  {
    showDateFilter: true,
    dataTestPrefix: 'investor-transaction-history'
  }
)

const dateRange = ref<[Date, Date] | null>(null)
const selectedType = ref('')

const typeDropdownOpen = ref(false)
const typeDropdownTarget = ref<HTMLElement | null>(null)

const uniqueTypes = computed(() => {
  const types = new Set(props.transactions.map((tx) => tx.type))
  return Array.from(types).sort()
})

const displayedTransactions = computed(() => {
  let filtered = props.transactions

  if (dateRange.value) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter((tx) => {
      const txDate = new Date(tx.date)
      return txDate >= startDate && txDate <= endDate
    })
  }

  if (selectedType.value) {
    filtered = filtered.filter((tx) => tx.type === selectedType.value)
  }

  return filtered
})

onClickOutside(typeDropdownTarget, () => {
  typeDropdownOpen.value = false
})
</script>
