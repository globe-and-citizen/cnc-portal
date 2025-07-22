<template>
  <!-- Stats Row -->
  <div class="flex justify-between items-stretch gap-4">
    <!-- Candidates Stat -->
    <ElectionStatsCard
      :data="formattedElection?.candidates"
      icon="user-group"
      color="blue"
      title="Candidates"
    />

    <!-- Start Date Stat -->
    <ElectionStatsCard
      :data="formatDate(formattedElection?.startDate ?? new Date())"
      icon="calendar"
      color="green"
      title="Starts"
    />

    <!-- End Date Stat -->
    <ElectionStatsCard
      :data="formatDate(formattedElection?.endDate ?? new Date())"
      icon="calendar-days"
      color="red"
      title="Ends"
    />

    <!-- Votes Stat -->
    <ElectionStatsCard
      :data="formattedElection?.votesCast"
      icon="chart-bar"
      color="purple"
      title="Votes Cast"
    />
  </div>
</template>
<script setup lang="ts">
import ElectionStatsCard from '@/components/sections/AdministrationView/ElectionStatsCard.vue'

const { formattedElection } = defineProps<{
  formattedElection: {
    id: number
    title: string
    description: string
    createdBy: string
    startDate: Date
    endDate: Date
    seatCount: number
    resultsPublished: boolean
    votesCast: number
    candidates: number
  }
}>()

// Format date as "Dec 15, 2023"
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style scoped>
/* Add slight spacing between stats on smaller screens */
@media (max-width: 768px) {
  .flex.justify-between {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
