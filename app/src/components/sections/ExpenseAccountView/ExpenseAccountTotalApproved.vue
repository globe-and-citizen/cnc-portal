<template>
  <OverviewCard
    :title="totalApproved"
    subtitle="Total Approved"
    color="info"
    :card-icon="personIcon"
    :loading="isLoading"
  />
</template>
<script setup lang="ts">
import personIcon from '@/assets/person.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { computed } from 'vue'
import { useTeamStore } from '@/stores'
import { useGetExpensesQuery } from '@/queries'

const teamStore = useTeamStore()

const { data: expenseData, isLoading } = useGetExpensesQuery({
  queryParams: { teamId: computed(() => teamStore.currentTeamId) }
})

// Number of distinct members with at least one approved expense.
const totalApproved = computed(() => {
  const approvals = expenseData.value ?? []
  return new Set(approvals.map((expense) => expense.userAddress.toLowerCase())).size
})
</script>
