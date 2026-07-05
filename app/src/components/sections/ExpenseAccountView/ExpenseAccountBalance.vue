<template>
  <OverviewCard
    data-test="expense-account-balance"
    :title="total[currencyStore.localCurrency.code]?.formated ?? 0"
    subtitle="Total Balance"
    variant="success"
    :card-icon="bagIcon"
    :loading="isLoading"
  />
</template>
<script setup lang="ts">
import bagIcon from '@/assets/bag.svg'
import OverviewCard from '@/components/ui/OverviewCard.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import { computed } from 'vue'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()
const expenseAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
const { total, isLoading } = useContractBalance(expenseAddress)
</script>
