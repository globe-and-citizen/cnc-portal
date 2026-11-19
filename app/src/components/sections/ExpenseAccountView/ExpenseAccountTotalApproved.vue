<template>
  <OverviewCard
    :title="totalApproved"
    subtitle="Total Approved"
    variant="info"
    :card-icon="personIcon"
    :loading="isLoading"
  />
</template>
<script setup lang="ts">
import OverviewCard from '@/components/ui/OverviewCard.vue'
import { computed } from 'vue'
import personIcon from '@/assets/person.svg'
import { useGetExpensesQuery } from '@/queries'
import { useTeamStore } from '@/stores'

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
