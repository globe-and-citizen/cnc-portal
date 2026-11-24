<template>
  <OverviewCard
    data-test="expense-account-balance"
    :title="balance?.total.local.formatted ?? 0"
    subtitle="Total Balance"
    variant="success"
    :card-icon="bagIcon"
    :loading="isLoading"
  />
</template>
<script setup lang="ts">
import OverviewCard from '@/components/ui/OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'
import { computed } from 'vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const expenseAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
const { data: balance, isLoading } = useContractBalance(expenseAddress)
</script>
